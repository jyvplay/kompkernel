#!/usr/bin/env python3
"""X90 COLD READ — an independent decoder for ΣΥΜΦΥΊΑ, in CPython, sharing nothing with the
encoder but the message.

WHY THIS FILE EXISTS RATHER THAN A ROUND TRIP TEST
-----------------------------------------------------------------------------
The TypeScript decoder shares a module, a type and a set of constants with the encoder, so a
byte-exact round trip proves only that the two halves agree with each other. It does not
prove the MESSAGE states its own decoder, which is the actual claim: that a reader with no
system prompt, no skills.md and no access to this repository can execute the wire. This file
is that reader. It is given a .sym.txt and nothing else, and it must recover the source byte
for byte.

It is deliberately written from the CONTRACT GRAMMAR as printed, not transliterated from
symphyia.ts. Where the two disagree, the contract is what a real reader has, so the contract
wins and the TypeScript is wrong.

WHAT IT VERIFIES, IN ORDER
  1. the contract line parses: the rules, the marker and the CRC are all recovered from the
     printed text alone, with no side channel.
  2. the expansion runs and is TOTAL: every marker is bound to a rule, every rule's sibling
     field exists on that line, and the form's fixed affix matches. Anything else raises
     rather than approximating.
  3. CRC-32 of the reconstruction, computed with zlib, equals the CRC printed in the
     contract. This is the strongest of the three, because it needs NO external data at all:
     the message certifies itself. A reader can tell a damaged message from an intact one
     using only the message, which is exactly the property X88's 244 silently-wrong decodes
     lacked.
  4. optionally, the SHA-256 of the reconstruction equals the SHA-256 of the original file
     recorded in the manifest by the encoder's side. This is the grading step; it uses data
     the reader was not given, and it is kept separate from step 3 for that reason.

THE LAYER UNDER TEST
The body here is the PRE-FRONTIER rewrite. The shipped message additionally carries the
frontier's glyph encoding, decoded by the existing cold checks (bench/aither_coldcheck.py,
bench/kenon_decode.py). Reading that layer again here would test nothing new about this
codec's own contract.
"""
import hashlib
import json
import os
import re
import sys
import zlib

WS = re.compile(r"\s")


# --------------------------------------------------------------------- fields
def fields(line):
    """Whitespace fields of one line WITH their byte spans, mirroring what a reader must
    assume: fields are separated by whitespace, and everything that is not a field
    (including the exact runs and kinds of whitespace) is preserved verbatim."""
    out = []
    n = len(line)
    k = 0
    while k < n:
        while k < n and WS.match(line[k]):
            k += 1
        if k >= n:
            break
        s = k
        while k < n and not WS.match(line[k]):
            k += 1
        out.append((line[s:k], s, k))
    return out


# ------------------------------------------------------------------- contract
def read_quoted(t, frm):
    """Read a double-quoted affix at t[frm], honouring backslash escapes. Returns
    (value, index_after_closing_quote) or None."""
    if frm >= len(t) or t[frm] != '"':
        return None
    k = frm + 1
    out = []
    while k < len(t):
        if t[k] == "\\" and k + 1 < len(t):
            out.append(t[k + 1])
            k += 2
            continue
        if t[k] == '"':
            return ("".join(out), k + 1)
        out.append(t[k])
        k += 1
    return None


def parse_contract(line):
    """Parse the contract line. Returns (rules, marker, crc) or raises.

    Grammar as printed:
        X90. Body first. RULE ('; ' RULE)* (1-based). crc=<8 hex>
      RULE, one of:
        f<J> = f<I> + text after <M>                    tail, no constant prefix
        f<J> = "A" + f<I> + text after <M>              tail, constant prefix A
        f<J> = text before <M> + f<I>                   head, no constant suffix
        f<J> = text before <M> + f<I> + "B"             head, constant suffix B
        <M> in f<J> = "A" + f<I> + "B"                  full (either affix may be absent)
    The full form is the only one that names the marker outside a rule's own text, because
    it collapses the entire field to the marker and would otherwise never print it.
    """
    if not line.startswith("X90."):
        raise ValueError("not an X90 contract")
    m = re.search(r" crc=([0-9a-f]{8})$", line)
    if not m:
        raise ValueError("no crc32 in the contract")
    crc = m.group(1)
    mid = line[4: len(line) - len(m.group(0))]
    if not mid.startswith(" Body first. "):
        raise ValueError("contract does not state the reading order")
    mid = mid[len(" Body first. "):]
    if not mid.endswith(" (1-based)."):
        raise ValueError("contract does not state the field numbering base")
    mid = mid[: -len(" (1-based).")]

    rules = []
    marker = None
    for part in mid.split("; "):
        lead = re.match(r"^(.+?) in (f\d+ = .+)$", part)
        if lead:
            if len(lead.group(1)) != 1:
                raise ValueError("leading marker is not one character")
            if marker is not None and marker != lead.group(1):
                raise ValueError("two different markers in one contract")
            marker = lead.group(1)
            part = lead.group(2)
        m2 = re.match(r"^f(\d+) = (.+)$", part)
        if not m2:
            raise ValueError("unparseable rule: %r" % part)
        j = int(m2.group(1))
        rhs = m2.group(2)
        A = B = ""
        ai = rhs.find(" + text after ")
        bi = rhs.find("text before ")
        if ai >= 0:
            form = "tail"
            mk = rhs[ai + len(" + text after "):]
            if len(mk) != 1:
                raise ValueError("marker is not one character")
            if marker is not None and marker != mk:
                raise ValueError("two different markers in one contract")
            marker = mk
            rhs = rhs[:ai]
            if rhs.startswith('"'):
                q = read_quoted(rhs, 0)
                if q is None or not rhs[q[1]:].startswith(" + "):
                    raise ValueError("bad prefix affix")
                A, rhs = q[0], rhs[q[1] + 3:]
        elif bi >= 0:
            form = "head"
            if not rhs.startswith("text before "):
                raise ValueError("bad head rule")
            rest = rhs[len("text before "):]
            sp = rest.find(" + f")
            if sp < 0:
                raise ValueError("bad head rule")
            mk = rest[:sp]
            if len(mk) != 1:
                raise ValueError("marker is not one character")
            if marker is not None and marker != mk:
                raise ValueError("two different markers in one contract")
            marker = mk
            rhs = rest[sp + 3:]
            fm = re.match(r"^f(\d+)", rhs)
            if not fm:
                raise ValueError("bad head rule source")
            after = rhs[len(fm.group(0)):]
            if after:
                if not after.startswith(" + "):
                    raise ValueError("bad suffix affix")
                q = read_quoted(after, 3)
                if q is None or q[1] != len(after):
                    raise ValueError("bad suffix affix")
                B = q[0]
            i = int(fm.group(1))
            rules.append({"j": j, "i": i, "form": form, "A": A, "B": B})
            continue
        else:
            form = "full"
            if rhs.startswith('"'):
                q = read_quoted(rhs, 0)
                if q is None or not rhs[q[1]:].startswith(" + "):
                    raise ValueError("bad prefix affix")
                A, rhs = q[0], rhs[q[1] + 3:]
            # a trailing quoted affix: scan back for the last well-formed one, so an escaped
            # quote inside it cannot be mistaken for the close
            cut = len(rhs) - 1
            while cut >= 3:
                if rhs[cut] == '"' and rhs[cut - 3:cut] == " + ":
                    q = read_quoted(rhs, cut)
                    if q is not None and q[1] == len(rhs):
                        B, rhs = q[0], rhs[: cut - 3]
                        break
                cut -= 1
        fm = re.match(r"^f(\d+)$", rhs)
        if not fm:
            raise ValueError("bad source field: %r" % rhs)
        rules.append({"j": j, "i": int(fm.group(1)), "form": form, "A": A, "B": B})

    if not rules:
        raise ValueError("contract states no rules")
    if marker is None:
        raise ValueError("contract never names its marker")
    return rules, marker, crc


# ------------------------------------------------------------------- expansion
def expand_line(line, rules, marker, by_target):
    if marker not in line:
        return line
    f = fields(line)
    pieces = []
    at = 0
    for k, (text, s, e) in enumerate(f):
        pieces.append(line[at:s])
        at = e
        m = text.find(marker)
        if m < 0:
            pieces.append(text)
            continue
        r = by_target.get(k + 1)
        if r is None:
            raise ValueError("marker in field %d, which no rule rebuilds" % (k + 1))
        if r["i"] - 1 >= len(f):
            raise ValueError("rule for f%d reads f%d, which this line does not have" % (r["j"], r["i"]))
        src = f[r["i"] - 1][0]
        H, T = text[:m], text[m + len(marker):]
        if r["form"] == "full":
            if text != marker:
                raise ValueError("full form expects the field to be the marker alone")
            full = r["A"] + src + r["B"]
        elif r["form"] == "tail":
            if H != "":
                raise ValueError("tail form expects nothing before the marker")
            full = r["A"] + src + T
        else:
            if T != "":
                raise ValueError("head form expects nothing after the marker")
            full = H + src + r["B"]
        pieces.append(full)
    pieces.append(line[at:])
    return "".join(pieces)


def decode(sym_text):
    nl = sym_text.find("\n")
    if nl < 0:
        raise ValueError("message has no body")
    contract, body = sym_text[:nl], sym_text[nl + 1:]
    rules, marker, crc = parse_contract(contract)
    by_target = {}
    for r in rules:
        if r["j"] in by_target:
            raise ValueError("two rules rebuild field %d" % r["j"])
        by_target[r["j"]] = r
    for r in rules:
        if r["i"] in by_target:
            raise ValueError("f%d is both a target and a source; rebuilding would need a fixed point" % r["i"])
    out = [expand_line(line, rules, marker, by_target) for line in body.split("\n")]
    text = "\n".join(out)
    got = "%08x" % (zlib.crc32(text.encode("utf-8")) & 0xFFFFFFFF)
    if got != crc:
        raise ValueError("CRC MISMATCH: contract says %s, reconstruction gives %s — the message is damaged or was misread" % (crc, got))
    return text, rules, marker, crc


def main():
    if len(sys.argv) < 2:
        print("usage: coldread.py <dir-or-file> [...]", file=sys.stderr)
        return 2
    d = "bench/x90/receipts/wires"
    manifest = {}
    mp = os.path.join(d, "manifest.json")
    if os.path.exists(mp):
        for a in json.load(open(mp))["artifacts"]:
            manifest[os.path.basename(a["artifact"])] = a
    paths = []
    for arg in sys.argv[1:]:
        if os.path.isdir(arg):
            paths += sorted(os.path.join(arg, f) for f in os.listdir(arg) if f.endswith(".sym.txt"))
        else:
            paths.append(arg)

    exact = wrong = 0
    for p in paths:
        name = os.path.basename(p)
        sym = open(p, encoding="utf-8").read()
        try:
            text, rules, marker, crc = decode(sym)
        except Exception as exc:                                   # noqa: BLE001
            print("REFUSED %-24s %s" % (name, exc))
            wrong += 1
            continue
        sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
        man = manifest.get(name)
        graded = ""
        if man:
            ok = man["sourceSha256"] == sha
            graded = "  SHA-256 %s" % ("MATCHES the original file" if ok else "DOES NOT MATCH: %s != %s" % (sha[:16], man["sourceSha256"][:16]))
            if ok:
                exact += 1
            else:
                wrong += 1
        else:
            exact += 1
        rs = ",".join("f%d:%s<-f%d" % (r["j"], r["form"], r["i"]) for r in rules)
        print("EXACT   %-24s %d bytes  crc32 %s verified from the message alone  rules %s  marker %s%s"
              % (name, len(text.encode("utf-8")), crc, rs, marker, graded))
    print("\n=== COLD READ, %d artifacts ===" % len(paths))
    print("reconstructed and self-certified by CRC: %d   wrong or refused: %d" % (exact, wrong))
    print("COLD READ %s" % ("EXACT" if wrong == 0 and exact == len(paths) else "FAILED"))
    return 0 if (wrong == 0 and exact == len(paths)) else 1


if __name__ == "__main__":
    sys.exit(main())
