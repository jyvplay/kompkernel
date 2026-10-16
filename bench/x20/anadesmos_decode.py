#!/usr/bin/env python3
"""
SECOND, EXTERNAL IMPLEMENTATION OF THE ANADESMOS READER (X20).

It is written from the note-line prose only. The decoder message a reader sees is:

    <CHIRON contract> ... <wire>
    The first line is a note about the text after it: do what it says, then drop that line.

and the first line of the expanded body is a "@nd" note whose sentences are exactly these:

    lines are W characters and a shorter line ends at its own break
    lines are W characters and a shorter line ends at M
    lines are wrapped at W characters
    each line holds K columns starting at A0,A1,.. and aligned <l/r letters><M>
    only in lines F to L
    column C has V digits after the point        /  columns C1,C2 have V digits after the point
    column C is V digits wide                    /  columns C1,C2 are V digits wide
    columns are split on X
    every line starts with its row number S+Ti padded to P digits followed by X
    line ends are CRLF

Nothing here shares code with src/lib/omega/anadesmos.ts beyond the CHIRON wire reader in
bench/chiron_decode.py, which is itself an independent third implementation of that layer. The
order of operations below is the one the contract states (undo in the order listed, and the note
lists them in the same order the encoder applied them, reversed).

Usage:  python3 bench/x20/anadesmos_decode.py cases.json out.json
where cases.json is a list of ANADESMOS wires and out.json the list of decoded texts (null on
anything this reader cannot parse — a parse failure is a real failure, never a guess).
"""
import json
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])            # bench/x20
sys.path.insert(0, __file__.rsplit("/", 1)[0] + "/..")     # bench
from chiron_decode import decode as chiron_decode          # noqa: E402

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]


def greedy_wrap(words, W):
    out, cur = [], ""
    for w in words:
        if cur == "":
            cur = w
        elif len(cur) + 1 + len(w) <= W:
            cur = cur + " " + w
        else:
            out.append(cur)
            cur = w
    if cur != "":
        out.append(cur)
    return out


def parse_note(line):
    """strict parser of the @nd note; returns a dict, or None if any sentence is unreadable"""
    assert line.startswith("@nd ") or line == "@nd"
    p = {"nl": None, "nlm": None, "wrap": None, "cols": None, "ral": None, "range": None,
         "dp": {}, "iw": {}, "sep": ",", "seq": None, "crlf": False}
    GAP = {"1 space": 1, "2 spaces": 2, "3 spaces": 3, "4 spaces": 4}

    def setcol(key, i, v):
        cur = p[key]
        cur[i] = v
        p[key] = cur

    for s in line[4:].split("; "):
        if s == "":
            continue
        m = re.fullmatch(r"lines are (\d+) chars and a shorter one ends at its own break", s)
        if m:
            p["nl"] = int(m.group(1))
            continue
        m = re.fullmatch(r"lines are (\d+) chars and a shorter one ends at (.)", s)
        if m:
            p["nlm"] = (int(m.group(1)), m.group(2))
            continue
        m = re.fullmatch(r"lines wrap at (\d+) chars", s)
        if m:
            p["wrap"] = int(m.group(1))
            continue
        m = re.fullmatch(r"each line holds (\d+) columns starting at ([\d,]+) and aligned ([lr]+)(.)", s)
        if m:
            A = [int(x) for x in m.group(2).split(",")]
            al = m.group(3)
            if len(A) != int(m.group(1)) or len(al) != len(A):
                return None
            p["cols"] = (A, al, m.group(4))
            continue
        m = re.fullmatch(r"fields aligned ([lr]+), (1 space|2 spaces|3 spaces|4 spaces) apart"
                         r"(?:, first at (\d+))?(?:, widths ([\d,]+)|, each width = widest entry)?"
                         r"(?:, rest at (\d+))?", s)
        if m:
            p["ral"] = {"al": m.group(1), "gap": GAP[m.group(2)],
                        "start": int(m.group(3) or 1) - 1,
                        "w": [int(x) for x in m.group(4).split(",")] if m.group(4) else None,
                        "rest": int(m.group(5)) - 1 if m.group(5) else None}
            continue
        m = re.fullmatch(r"lines (\d+)-(\d+) only", s)
        if m:
            p["range"] = (int(m.group(1)) - 1, int(m.group(2)) - 1)
            continue
        m = re.fullmatch(r"col (\d+) = (\d+) decimals", s)
        if m:
            setcol("dp", int(m.group(1)) - 1, int(m.group(2)))
            continue
        m = re.fullmatch(r"cols ([\d,]+) = (\d+) decimals", s)
        if m:
            for c in m.group(1).split(","):
                setcol("dp", int(c) - 1, int(m.group(2)))
            continue
        m = re.fullmatch(r"col (\d+) = (\d+) digits zero-padded", s)
        if m:
            setcol("iw", int(m.group(1)) - 1, int(m.group(2)))
            continue
        m = re.fullmatch(r"cols ([\d,]+) = (\d+) digits zero-padded", s)
        if m:
            for c in m.group(1).split(","):
                setcol("iw", int(c) - 1, int(m.group(2)))
            continue
        m = re.fullmatch(r"split on (.+)", s)
        if m:
            p["sep"] = unescape_sep(m.group(1))
            continue
        m = re.fullmatch(r"(every line|lines (\d+)-(\d+)) starts with its number (\d+)\+(\d+)i"
                         r"(?: padded (\d+))? then (.*)", s)
        if m:
            all_lines = m.group(1) == "every line"
            lo = 0 if all_lines else int(m.group(2)) - 1
            hi = 0 if all_lines else int(m.group(3)) - 1
            p["seq"] = {"all": all_lines, "from": lo, "to": hi, "start": int(m.group(4)),
                        "step": int(m.group(5)), "pad": int(m.group(6) or 0),
                        "sep": "" if m.group(7) == "nothing" else unescape_sep(m.group(7))}
            continue
        if s == "line ends are CRLF":
            p["crlf"] = True
            continue
        return None
    return p


def unescape_sep(x):
    out, i = [], 0
    while i < len(x):
        if x[i] == "\\" and i + 1 < len(x):
            nxt = x[i + 1]
            out.append(" " if nxt == "s" else ":" if nxt == "c" else "\\" if nxt == "\\" else nxt)
            i += 2
        else:
            out.append(x[i])
            i += 1
    return "".join(out)


def in_range(i, rng):
    return rng is None or (rng[0] <= i <= rng[1])


def undo(body, p):
    t = body
    # ---- line cut (undo first: it is the outermost transformation) ----
    if p["nlm"] is not None:
        W, mk = p["nlm"]
        out, i = [], 0
        while i < len(t):
            k = t.find(mk, i)
            if k != -1 and k - i < W:
                out.append(t[i:k])
                i = k + len(mk)
            else:
                out.append(t[i:i + W])
                i += W
        t = "\n".join(out)
    if p["nl"] is not None:
        W = p["nl"]
        out, i = [], 0
        while i < len(t):
            k = t.find("\n", i)
            if k != -1 and k - i < W:
                out.append(t[i:k])
                i = k + 1
            else:
                out.append(t[i:i + W])
                i += W
        t = "\n".join(out)
    if p["wrap"] is not None:
        W = p["wrap"]
        t = "\n\n".join("\n".join(greedy_wrap([w for w in par.split() if w], W)) for par in t.split("\n\n"))
    # ---- columns ----
    if p["cols"] is not None:
        A, al, mk = p["cols"]
        k = len(A)
        new_lines = []
        for line in t.split("\n"):
            if line.startswith(mk):
                new_lines.append(line[len(mk):])
                continue
            fs = line.split(" ")
            if len(fs) < k:
                new_lines.append(line)
                continue
            fields, rest = fs[:k], " ".join(fs[k:])
            cells = []
            bad = False
            for c in range(k):
                s = A[c] if al[c] == "l" else A[c] - len(fields[c])
                if s < 0 or " " in fields[c]:
                    bad = True
                    break
                cells.append((s, s + len(fields[c])))
            if bad or any(cells[c][0] < cells[c - 1][1] for c in range(1, k)):
                new_lines.append(line)
                continue
            end = max(x[1] for x in cells)
            arr = [" "] * end
            for c in range(k):
                s = cells[c][0]
                for j, ch in enumerate(fields[c]):
                    arr[s + j] = ch
            head = "".join(arr)
            new_lines.append(head if rest == "" else head + " " + rest)
        t = "\n".join(new_lines)
    if p["ral"] is not None:
        q = p["ral"]
        k = len(q["al"])
        lo, hi = (0, len(t.split("\n")) - 1) if p["range"] is None else p["range"]
        lines = t.split("\n")
        box = []
        for i in range(lo, hi + 1):
            sp = [m for m in re.finditer(r"\S+", lines[i])]
            if len(sp) < k:
                box.append(None)
                continue
            fields = [m.group(0) for m in sp[:k]]
            rest = lines[i][sp[k].start():] if (q["rest"] is not None and len(sp) > k) else ""
            box.append((fields, rest, sp))
        widths = q["w"]
        if widths is None:
            widths = [0] * k
            for b in box:
                if b is None:
                    continue
                for c in range(k):
                    widths[c] = max(widths[c], len(b[0][c]))
        pos, cur = [], 0
        for c in range(k):
            pos.append(cur)
            cur = pos[c] + widths[c] + q["gap"]
        first = q["start"]
        pos = [first + (pos[c] - 0) for c in range(k)]
        for i, b in enumerate(box):
            if b is None:
                continue
            fields, rest, _ = b
            n = pos[k - 1] + widths[k - 1]
            if rest != "" and q["rest"] is not None:
                n = max(n, q["rest"] + len(rest))
            buf = [" "] * n
            for c in range(k):
                at = pos[c] + widths[c] - len(fields[c]) if q["al"][c] == "r" else pos[c]
                for j, chx in enumerate(fields[c]):
                    buf[at + j] = chx
            if rest != "" and q["rest"] is not None:
                for j, chx in enumerate(rest):
                    buf[q["rest"] + j] = chx
            lines[i + lo] = "".join(buf).rstrip(" ")
        t = "\n".join(lines)
    # ---- numeric columns ----
    if p["iw"]:
        lines = t.split("\n")
        out = []
        for i, line in enumerate(lines):
            if not in_range(i, p["range"]):
                out.append(line)
                continue
            cells = line.split(p["sep"])
            for c, w in p["iw"].items():
                if c < len(cells) and re.fullmatch(r"-?\d+", cells[c]):
                    cells[c] = cells[c].rjust(w, "0")
            out.append(p["sep"].join(cells))
        t = "\n".join(out)
    if p["dp"]:
        lines = t.split("\n")
        out = []
        for i, line in enumerate(lines):
            if not in_range(i, p["range"]):
                out.append(line)
                continue
            cells = line.split(p["sep"])
            for c, w in p["dp"].items():
                if c < len(cells):
                    m = re.fullmatch(r"(-?\d+)(?:\.(\d*))?", cells[c])
                    if m:
                        cells[c] = m.group(1) + "." + (m.group(2) or "").ljust(w, "0")
            out.append(p["sep"].join(cells))
        t = "\n".join(out)
    # ---- row numbers ----
    if p["seq"] is not None:
        q = p["seq"]
        lines = t.split("\n")
        lo = 0 if q["all"] else q["from"]
        hi = len(lines) - 1 if q["all"] else q["to"]
        for i in range(lo, min(hi + 1, len(lines))):
            j = i - lo
            v = str(q["start"] + q["step"] * j)
            if q["pad"]:
                v = v.rjust(q["pad"], "0")
            lines[i] = v + q["sep"] + lines[i]
        t = "\n".join(lines)
    if p["crlf"]:
        t = t.replace("\n", "\r\n")
    return t


def decode(wire):
    txt = chiron_decode(wire)
    if txt is None:
        return None
    if txt.startswith("@raw\n"):
        return txt[5:]
    if not txt.startswith("@nd"):
        return txt
    nl = txt.find("\n")
    if nl < 0:
        return None
    p = parse_note(txt[:nl])
    if p is None:
        return None
    return undo(txt[nl + 1:], p)


def main():
    cases = json.load(open(sys.argv[1], encoding="utf-8"))
    out = []
    for w in cases:
        try:
            out.append(decode(w))
        except Exception:                              # noqa: BLE001
            out.append(None)
    json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)


if __name__ == "__main__":
    main()
