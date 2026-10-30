#!/usr/bin/env python3
"""Independent EIRMOS twin decoder (CPython, stdlib only).

Written from the in-band contract text + reduced text.
Usage: py-decode.py <contract.txt> <reduced.txt> <source.txt>
"""
import re
import sys

DELIM_WORDS = {"comma": ",", "tab": "\t", "semicolon": ";", "pipe": "|"}


def split_line(line, delim):
    raws, vals, cur, start, i, n = [], [], "", 0, 0, len(line)
    while True:
        if i < n and line[i] == '"':
            i += 1
            while i < n:
                if line[i] == '"':
                    if i + 1 < n and line[i + 1] == '"':
                        cur += '"'; i += 2
                    else:
                        i += 1; break
                else:
                    cur += line[i]; i += 1
        else:
            while i < n and line[i] != delim:
                cur += line[i]; i += 1
        raws.append(line[start:i]); vals.append(cur); cur = ""
        if i >= n:
            break
        i += 1; start = i
        if i == n:
            raws.append(""); vals.append(""); break
    return raws, vals


def render_field(value, delim):
    if any(c in value for c in (delim, '"', "\n", "\r")):
        return '"' + value.replace('"', '""') + '"'
    return value


def apply_tf(tf, v):
    if tf is None:
        return v
    if tf == "lowercase":
        return v.lower()
    if tf == "UPPERCASE":
        return v.upper()
    if tf == "capfirst":
        return v[:1].upper() + v[1:] if v else v
    if tf == "initial":
        return v[:1]
    if tf == "lowercase-initial":
        return v[:1].lower()
    if tf == "UPPERCASE-initial":
        return v[:1].upper()
    if tf == "first2":
        return v[:2]
    if tf == "first3":
        return v[:3]
    raise ValueError(tf)


def split_parts(expr):
    parts, cur, in_q = [], "", False
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch == '"':
            in_q = not in_q; cur += ch; i += 1
        elif not in_q and expr.startswith(" + ", i):
            parts.append(cur); cur = ""; i += 3
        else:
            cur += ch; i += 1
    parts.append(cur)
    return parts


def main():
    contract = open(sys.argv[1], encoding="utf-8").read()
    reduced = open(sys.argv[2], encoding="utf-8").read()
    source = open(sys.argv[3], encoding="utf-8").read()

    m = re.match(r"EIRMOS: after decoding below, in the (\w+)-separated table insert as header field and value in every row: (.*)\. \{x\} means", contract)
    if not m:
        print("FAIL contract-shape"); return 1
    delim = DELIM_WORDS[m.group(1)]

    raw_lines = reduced.split("\n")
    lines = []
    for i, body in enumerate(raw_lines):
        is_last = i == len(raw_lines) - 1
        eol = "" if is_last else "\n"
        if not is_last and body.endswith("\r"):
            body, eol = body[:-1], "\r\n"
        lines.append((body, eol))
    if lines and lines[-1][0] == "" and lines[-1][1] == "":
        lines.pop()
    parsed = [split_line(b, delim) for b, _e in lines]
    rowvals = [v for _r, v in parsed]
    finished = [list(r) for r, _v in parsed]
    header = rowvals[0]
    R = len(lines) - 1

    items = []
    for part in re.split(r"; (?=field \d+ )", m.group(2)):
        mm = re.match(r'field (\d+)(?: "([^"]*)"| \(empty name\))?: (.*)$', part)
        if not mm:
            print("FAIL item-parse", part); return 1
        items.append((int(mm.group(1)) - 1, mm.group(2), mm.group(3)))
    dropped_fields = [c for c, _n, _e in items]

    def red_idx(ref):
        rm = re.fullmatch(r"\{([^}]*)\}", ref)
        if rm:
            name = rm.group(1)
            if header.count(name) != 1:
                raise ValueError("ambiguous ref " + ref)
            return header.index(name)
        fm = re.fullmatch(r"field (\d+)", ref)
        fc = int(fm.group(1)) - 1
        return fc - sum(1 for d in dropped_fields if d < fc)

    computed = {}
    for col, name, expr in items:
        exc = {}
        em = re.search(r" \[except (.*)\]$", expr)
        if em:
            # exception values may contain ', ' only if the encoder allowed it;
            # split on ', data row ' boundaries instead
            body = em.group(1)
            chunks = re.split(r", (?=data row \d+ = )", body)
            for e in chunks:
                emm = re.match(r"data row (\d+) = (.*)", e, re.S)
                v = emm.group(2)
                exc[int(emm.group(1)) - 1] = "" if v == "(empty)" else v
            expr = expr[:em.start()]
        pieces = []
        for piece in split_parts(expr):
            if len(piece) >= 2 and piece[0] == '"' and piece[-1] == '"':
                pieces.append(("lit", piece[1:-1]))
            else:
                tm = re.fullmatch(r"(?:(lowercase|UPPERCASE|capfirst|initial|lowercase-initial|UPPERCASE-initial|first2|first3) )?(\{[^}]*\}|field \d+)", piece)
                if not tm:
                    print("FAIL piece-parse", repr(piece)); return 1
                pieces.append(("src", tm.group(1), red_idx(tm.group(2))))
        vals = []
        for i in range(R):
            if i in exc:
                vals.append(exc[i]); continue
            out = ""
            for p in pieces:
                out += p[1] if p[0] == "lit" else apply_tf(p[1], rowvals[i + 1][p[2]])
            vals.append(out)
        computed[col] = (name, vals)

    for col in sorted(computed):
        name, vals = computed[col]
        finished[0].insert(col, render_field(name or "", delim))
        for i in range(R):
            finished[i + 1].insert(col, render_field(vals[i], delim))

    out = "".join(delim.join(finished[i]) + lines[i][1] for i in range(len(lines)))
    if out == source:
        print("PASS byte-exact"); return 0
    print("FAIL mismatch", len(out), len(source))
    for i, (x, y) in enumerate(zip(out.split("\n"), source.split("\n"))):
        if x != y:
            print("line", i, repr(x[:160]), "!=", repr(y[:160])); break
    return 1


if __name__ == "__main__":
    sys.exit(main())
