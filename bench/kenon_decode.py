#!/usr/bin/env python3
"""KENON (X86) cold-read decoder — CPython, no TypeScript, no repo state.

This is the verification standard this stack holds itself to (X39): a reader in a
DIFFERENT language, given ONLY the message file — one contract line, then the
columnar wire — must reconstruct the source bytes exactly. Nothing is imported from
the encoder, no marker or delimiter is passed on the command line, and no side
channel is read: everything the decoder uses it takes from the message.

    python3 bench/kenon_decode.py MESSAGE.txt --check SOURCE.txt
    python3 bench/kenon_decode.py MESSAGE.txt -o OUT.txt

Exit status 0 = byte-identical, 1 = mismatch, 2 = the message was refused (the
decoder will not guess).

WIRE GRAMMAR (as read from the message, not from the encoder)

    <contract line>\n
    ⟨ k ¦ spec_0 ¦ ... ¦ spec_{k-1} ¦ p PATTERN ⟩ ¦ s [MARKER] \n
    <body lines>

  k          column count, decimal
  spec_j     ANCHOR + CODEC for column j
  ANCHOR     L n  cell starts at character n
             R n  cell ends at character n (so it starts at n - len(value))
             T n  cell starts n characters after the previous cell ends
  CODEC      x        one value per body line
             r N      N body lines, each `value` or `value MARKER count`
             d N      N body lines of dictionary values, then one line of N index
                      characters from `abcdefghijklmnopqrstuvwxyz0123456789`
             w W      ONE body line: the values concatenated, each exactly W chars
             l:TPL/at,s   numeric template TPL, value at row `at` is the sample,
                          each row adds s
             k:TPL/at,s   clock template (MM:SS or HH:MM:SS), same law
             t:SAMPLE/s0,s1,...   compound: SAMPLE split into literal/number
                          fields; field i of row r is number_i + s_i * r, printed
                          with the sample's zero-padding. A step written `s%M`
                          means (number_i + s*r) mod M.
  PATTERN    run-length over R (grid row) and L (literal line), e.g. L1R18L1
  s / S      line ending: `s` = LF, `S` = CRLF
  MARKER     optional, after the eol flag: the run marker. Defaults to `*`.

  Body lines are consumed in COLUMN order: all of column 0's block, then column
  1's, and so on; whatever is left over is the literal lines, in source order.

  Rebuild: walk the pattern; for R take one value per column, place it at its
  anchor (a cell never overlaps the previous one — at least one space between),
  and for L emit the literal line verbatim. Join with the declared line ending.
"""
import re
import sys

OPEN = "\u27e8"
CLOSE = "\u27e9"
DELIMS = ["\u00a6", "\u241f", "\u2016", "\u205e", "\u00b7", "\u2021"]
IDX = "abcdefghijklmnopqrstuvwxyz0123456789"
MAX_COLS = 24
SAFE = 2 ** 53


class Refused(Exception):
    pass


def safe_int(x):
    return isinstance(x, int) and abs(x) < SAFE


def num(x, what):
    """Integer or refuse. `int(' ')` raising ValueError out of the decoder would be
    an uncaught crash on a malformed wire, and a decoder that cannot parse a field
    must refuse, not guess."""
    t = x.strip() if isinstance(x, str) else x
    if not re.fullmatch(r"[+-]?\d+", t or ""):
        raise Refused("%s is not an integer: %r" % (what, x))
    v = int(t)
    if not safe_int(v):
        raise Refused("%s out of safe-integer range" % what)
    return v


def expand_runs(r):
    out = []
    i = 0
    while i < len(r):
        c = r[i]
        if c not in ("R", "L"):
            raise Refused("pattern character %r" % c)
        j = i + 1
        while j < len(r) and r[j].isdigit():
            j += 1
        if j == i + 1:
            raise Refused("pattern run without a count")
        n = int(r[i + 1:j])
        if n < 1 or n > 10 ** 6:
            raise Refused("pattern count out of range")
        out.append(c * n)
        i = j
    s = "".join(out)
    if not s:
        raise Refused("empty pattern")
    return s


def split_fields(v):
    lits, nums, last = [], [], 0
    for m in re.finditer(r"(\d+)", v):
        lits.append(v[last:m.start()])
        nums.append(m.group(1))
        last = m.end()
    lits.append(v[last:])
    if not nums or len(nums) > 6:
        return None
    return lits, nums


def parse_num_template(field):
    m = re.match(r"^(\D*?)(-?)(\d+)(?:\.(\d+))?(\D*)$", field)
    if not m:
        return None
    dec = len(m.group(4)) if m.group(4) else 0
    mag = int(m.group(3) + (m.group(4) or ""))
    v = -mag if m.group(2) == "-" else mag
    return {"pre": m.group(1), "suf": m.group(5), "dec": dec, "width": len(m.group(3))}, v


def render_num_template(t, v):
    if not safe_int(v):
        return None
    neg = v < 0
    av = abs(v)
    unit = 10 ** t["dec"]
    ip = str(av // unit)
    if len(ip) > t["width"]:
        return None
    fp = "." + str(av % unit).rjust(t["dec"], "0") if t["dec"] else ""
    return t["pre"] + ("-" if neg else "") + ip.rjust(t["width"], "0") + fp + t["suf"]


def parse_clock_template(field):
    m = re.match(r"^(\D*)(\d{1,2}):(\d{2})(?::(\d{2}))?(\D*)$", field)
    if not m:
        return None
    nf = 3 if m.group(4) is not None else 2
    v = (int(m.group(2)) * 3600 + int(m.group(3)) * 60 + int(m.group(4))) if nf == 3 \
        else (int(m.group(2)) * 60 + int(m.group(3)))
    return {"pre": m.group(1), "suf": m.group(5), "fields": nf}, v


def render_clock_template(t, v):
    if not safe_int(v) or v < 0:
        return None
    p = lambda x: str(x).rjust(2, "0")
    if t["fields"] == 2:
        if v >= 3600:
            return None
        return t["pre"] + p(v // 60) + ":" + p(v % 60) + t["suf"]
    return t["pre"] + p(v // 3600) + ":" + p((v // 60) % 60) + ":" + p(v % 60) + t["suf"]


def render_compound(lits, fields, steps, r, mods):
    out = ""
    for i, f in enumerate(fields):
        v = f["v"] + steps[i] * r
        if mods[i] and mods[i] > 1:
            v = ((v % mods[i]) + mods[i]) % mods[i]
        if not safe_int(v) or v < 0:
            return None
        d = str(v)
        out += lits[i] + (d.rjust(f["w"], "0") if f["pad"] else d)
    return out + lits[len(fields)]


def decode(message):
    """message: the full ΚΕΝΟΝ message (contract line + wire). Returns the source."""
    nl = message.find("\n")
    if nl < 0:
        raise Refused("no contract line")
    contract, wire = message[:nl], message[nl + 1:]
    if not contract.startswith("Grid:"):
        raise Refused("contract line does not describe a grid")

    if not wire.startswith(OPEN):
        raise Refused("wire does not start with the open glyph")
    nl2 = wire.find("\n")
    head = wire if nl2 < 0 else wire[:nl2]
    rest = "" if nl2 < 0 else wire[nl2 + 1:]

    # A spec field carries SAMPLES, and a sample may contain the close glyph, so the
    # terminator is the LAST `⟩` followed by a delimiter and the eol flag.
    close = -1
    i = head.find(CLOSE)
    while i >= 0:
        d = head[i + 1:i + 2]
        f = head[i + 2:i + 3]
        if d and d in DELIMS and f in ("s", "S"):
            close = i
        i = head.find(CLOSE, i + 1)
    if close < 0:
        raise Refused("no header terminator")
    inner = head[len(OPEN):close]
    delim = head[close + 1]
    if delim not in DELIMS:
        raise Refused("bad delimiter")
    fields = inner.split(delim)
    if len(fields) < 4:
        raise Refused("too few header fields")
    if not fields[0].isdigit():
        raise Refused("column count is not a number")
    k = int(fields[0])
    if k < 1 or k > MAX_COLS or len(fields) != k + 2:
        raise Refused("column count disagrees with the field count")

    tail = head[close + 1:].split(delim)
    if len(tail) != 2 or tail[0] != "":
        raise Refused("bad header tail")
    tf = tail[1]
    crlf = tf[0] == "S"
    if not crlf and tf[0] != "s":
        raise Refused("bad eol flag")
    if len(tf) > 2:
        raise Refused("bad eol field")
    marker = tf[1] if len(tf) == 2 else "*"

    # The contract must name the marker the wire uses. A reader who is told `v*count`
    # and then meets `ii§35` has been misinformed about the one rule that separates a
    # repeated value from a literal one, so this decoder refuses rather than guesses.
    m = re.search(r"v(.)count", contract)
    if m and m.group(1) != marker:
        raise Refused("contract names marker %r but the wire declares %r" % (m.group(1), marker))

    specs = []
    for j in range(k):
        mm = re.match(r"^([LRT])(\d+)([a-z].*)$", fields[j + 1])
        if not mm:
            raise Refused("bad spec %r" % fields[j + 1])
        kind, at, c = mm.group(1), num(mm.group(2), "anchor offset"), mm.group(3)
        if kind == "T" and at < 1:
            raise Refused("T anchor needs at least one space")
        block = 0
        if c == "x":
            codec = {"kind": "x"}
        elif c[0] == "w":
            if not c[1:].isdigit() or int(c[1:]) < 1:
                raise Refused("bad w width")
            codec = {"kind": "w", "w": int(c[1:])}
        elif c[0] == "r":
            if not c[1:].isdigit() or not (1 <= int(c[1:]) <= 10 ** 6):
                raise Refused("bad r block length")
            block = int(c[1:])
            codec = {"kind": "r"}
        elif c[0] == "d":
            if not c[1:].isdigit() or not (1 <= int(c[1:]) <= 10 ** 6):
                raise Refused("bad d block length")
            block = int(c[1:])
            codec = {"kind": "d"}
        elif c.startswith("t:"):
            body = c[2:]
            slash = body.rfind("/")
            if slash < 0:
                raise Refused("t: without steps")
            sample, steps_raw = body[:slash], body[slash + 1:].split(",")
            sf = split_fields(sample)
            if sf is None:
                raise Refused("t: sample does not split into fields")
            lits, nums = sf
            fl = [{"v": num(n, "t: field"), "w": len(n), "pad": len(n) > 1 and n[0] == "0"} for n in nums]
            if len(steps_raw) != len(fl):
                raise Refused("t: step count disagrees with field count")
            steps, mods = [], []
            for x in steps_raw:
                pct = x.find("%")
                st = num(x if pct < 0 else x[:pct], "t: step")
                mod_raw = "" if pct < 0 else x[pct + 1:]
                if pct >= 0 and mod_raw == "":
                    raise Refused("t: % without a modulus")
                md = 0 if pct < 0 else num(mod_raw, "t: modulus")
                if pct >= 0 and md < 2:
                    raise Refused("t: modulus below 2")
                steps.append(st)
                mods.append(md)
            codec = {"kind": "t", "lits": lits, "fields": fl, "steps": steps, "mods": mods}
        elif c.startswith("l:") or c.startswith("k:"):
            body = c[2:]
            cut = body.rfind(",")
            slash = body.rfind("/", 0, cut) if cut >= 0 else -1
            if cut < 0 or slash < 0:
                raise Refused("l:/k: without at,step")
            sample = body[:slash]
            at_row = num(body[slash + 1:cut], "l:/k: row")
            step = num(body[cut + 1:], "l:/k: step")
            p = parse_num_template(sample) if c[0] == "l" else parse_clock_template(sample)
            if p is None:
                raise Refused("unparsable template sample")
            t, v = p
            back = render_num_template(t, v) if c[0] == "l" else render_clock_template(t, v)
            if back != sample:
                raise Refused("template does not re-render its own sample")
            codec = {"kind": c[0], "t": t, "v": v, "at": at_row, "s": step}
        else:
            raise Refused("unknown codec %r" % c)
        specs.append({"anchor": kind, "at": at, "codec": codec, "block": block})

    pf = fields[k + 1]
    if not pf.startswith("p"):
        raise Refused("no row pattern")
    pat = expand_runs(pf[1:])
    rows = pat.count("R")

    body = [] if rest == "" else rest.split("\n")
    if not body and pat.count("L") == 1:
        body = [""]

    cols, bi = [], 0
    for sp in specs:
        c = sp["codec"]
        if c["kind"] in ("l", "k", "t"):
            vs = []
            for r in range(rows):
                if c["kind"] == "t":
                    got = render_compound(c["lits"], c["fields"], c["steps"], r, c["mods"])
                elif c["kind"] == "l":
                    got = render_num_template(c["t"], c["v"] + c["s"] * (r - c["at"]))
                else:
                    got = render_clock_template(c["t"], c["v"] + c["s"] * (r - c["at"]))
                if got is None:
                    raise Refused("generator produced no value at row %d" % r)
                vs.append(got)
            cols.append(vs)
            continue
        if c["kind"] == "x":
            if bi + rows > len(body):
                raise Refused("x block runs past the body")
            cols.append(body[bi:bi + rows])
            bi += rows
            continue
        if c["kind"] == "w":
            need = c["w"] * rows
            if bi >= len(body):
                raise Refused("w block missing")
            acc = body[bi]
            bi += 1
            if len(acc) != need:
                raise Refused("w block is %d chars, expected %d" % (len(acc), need))
            cols.append([acc[r * c["w"]:(r + 1) * c["w"]] for r in range(rows)])
            continue
        if c["kind"] == "r":
            if bi + sp["block"] > len(body):
                raise Refused("r block runs past the body")
            lines = body[bi:bi + sp["block"]]
            bi += sp["block"]
            vs = []
            for part in lines:
                star = part.rfind(marker)
                n, v = 1, part
                if star > 0:
                    t = part[star + len(marker):]
                    if not t.isdigit():
                        raise Refused("run count is not a number")
                    n, v = int(t), part[:star]
                    if n < 1 or n > 10 ** 6:
                        raise Refused("run count out of range")
                vs.extend([v] * n)
            if len(vs) != rows:
                raise Refused("r block expands to %d values, expected %d" % (len(vs), rows))
            cols.append(vs)
            continue
        # dictionary
        if bi + sp["block"] + 1 > len(body):
            raise Refused("d block runs past the body")
        dic = body[bi:bi + sp["block"]]
        bi += sp["block"]
        idx = body[bi]
        bi += 1
        if len(idx) != rows:
            raise Refused("index line is %d chars, expected %d" % (len(idx), rows))
        vs = []
        for ch in idx:
            p = IDX.find(ch)
            if p < 0 or p >= len(dic):
                raise Refused("index character %r out of range" % ch)
            vs.append(dic[p])
        cols.append(vs)

    lits = body[bi:]
    if len(lits) != pat.count("L"):
        raise Refused("%d literal lines left over, pattern declares %d" % (len(lits), pat.count("L")))

    out, li, r = [], 0, 0
    for ch in pat:
        if ch == "L":
            out.append(lits[li])
            li += 1
            continue
        pos, line = 0, ""
        for j in range(k):
            v = cols[j][r]
            a, at = specs[j]["anchor"], specs[j]["at"]
            if a == "L":
                start = at
            elif a == "R":
                start = at - len(v)
            else:
                start = pos + at
            if start < 0:
                raise Refused("anchor puts a cell before column 0")
            if j > 0 and start <= pos:
                raise Refused("cells overlap: column %d needs at least one space" % j)
            line += " " * (start - pos) + v
            pos = start + len(v)
        out.append(line)
        r += 1
    return ("\r\n" if crlf else "\n").join(out)


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    with open(argv[1], "r", encoding="utf-8", newline="") as f:
        message = f.read()
    try:
        got = decode(message)
    except Refused as e:
        print("REFUSED: %s" % e)
        return 2
    out, check = None, None
    i = 2
    while i < len(argv):
        if argv[i] == "-o":
            out = argv[i + 1]
            i += 2
        elif argv[i] == "--check":
            check = argv[i + 1]
            i += 2
        else:
            i += 1
    if out:
        with open(out, "w", encoding="utf-8", newline="") as f:
            f.write(got)
    if check:
        with open(check, "r", encoding="utf-8", newline="") as f:
            want = f.read()
        if got == want:
            print("EXACT %d chars %d lines" % (len(got), got.count("\n") + 1))
            return 0
        print("MISMATCH: decoded %d chars, source %d chars" % (len(got), len(want)))
        j = 0
        while j < min(len(got), len(want)) and got[j] == want[j]:
            j += 1
        print("first difference at %d: %r vs %r" % (j, got[max(0, j - 40):j + 40], want[max(0, j - 40):j + 40]))
        return 1
    sys.stdout.write(got)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
