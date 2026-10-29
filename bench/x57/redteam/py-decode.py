#!/usr/bin/env python3
"""Independent SYZYGIA twin decoder (CPython, stdlib only).

Written from the in-band contract text + reduced text (the parent's decoded
output: table plus section lines). Parses the contract's field items,
recomputes each dropped field with Decimal arithmetic, applies the
section-line corrections, and re-renders the table. Byte-compares against
the original source. German format is not implemented in the twin (v1 lane
coverage is plain); trunc-marked fields are supported.

Usage: py-decode.py <contract.txt> <reduced.txt> <source.txt>
"""
import re
import sys
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN
from fractions import Fraction

DELIM_WORDS = {"comma": ",", "tab": "\t", "semicolon": ";", "pipe": "|"}


def split_line(line, delim):
    # CSV split returning (raw_fields, values): kept fields are re-emitted
    # from their raw spans so original quoting survives byte-exactly.
    raws, vals, cur, start, i, n = [], [], "", 0, 0, len(line)
    while True:
        if i < n and line[i] == '"':
            i += 1
            while i < n:
                if line[i] == '"':
                    if i + 1 < n and line[i + 1] == '"':
                        cur += '"'
                        i += 2
                    else:
                        i += 1
                        break
                else:
                    cur += line[i]
                    i += 1
        else:
            while i < n and line[i] != delim:
                cur += line[i]
                i += 1
        raws.append(line[start:i])
        vals.append(cur)
        cur = ""
        if i >= n:
            break
        i += 1  # skip delim
        start = i
        if i == n:
            raws.append("")
            vals.append("")
            break
    return raws, vals


def render_field(value, delim):
    if any(c in value for c in (delim, '"', "\n", "\r")):
        return '"' + value.replace('"', '""') + '"'
    return value


def const_of(tok):
    tok = tok.strip()
    if "/" in tok:
        p, q = tok.split("/", 1)
        return Fraction(int(p), int(q))
    return Fraction(Decimal(tok))


def main():
    contract_path, reduced_path, source_path = sys.argv[1:4]
    contract = open(contract_path, encoding="utf-8").read()
    reduced = open(reduced_path, encoding="utf-8").read()
    source = open(source_path, encoding="utf-8").read()

    m = re.match(r"SYZYGIA: after decoding below, in the (\w+)-separated table insert as header field and value in every row: (.*)\. Round each", contract)
    if not m:
        print("FAIL contract-shape")
        return 1
    delim = DELIM_WORDS[m.group(1)]
    items_text = m.group(2)
    items = []
    for part in items_text.split("; "):
        mm = re.match(r'field (\d+)(?: "([^"]*)"| \(empty name\))?: (.+) \((\d+) decimals\)(T?)$', part)
        if not mm:
            print("FAIL item-parse", part)
            return 1
        field_no = int(mm.group(1))
        name = mm.group(2)
        expr = mm.group(3)
        scale = int(mm.group(4))
        trunc = mm.group(5) == "T"
        em = re.match(r"([^×]+)×(?:\{([^}]*)\}|field (\d+))(?:\+\(([^)]*)\))?$", expr)
        if not em:
            print("FAIL expr-parse", expr)
            return 1
        a = const_of(em.group(1))
        src_name, src_field = em.group(2), em.group(3)
        b = const_of(em.group(4)) if em.group(4) is not None else Fraction(0)
        items.append(dict(field=field_no, name=name, a=a, b=b, scale=scale,
                          trunc=trunc, src_name=src_name,
                          src_field=int(src_field) if src_field else None))
    items.sort(key=lambda d: d["field"])

    # split reduced into table lines + section lines; keep eols
    raw_lines = reduced.split("\n")
    lines = []
    for i, body in enumerate(raw_lines):
        is_last = i == len(raw_lines) - 1
        eol = "" if is_last else "\n"
        if not is_last and body.endswith("\r"):
            body, eol = body[:-1], "\r\n"
        lines.append((body, eol))
    # trailing empty artifact
    if lines and lines[-1][0] == "" and lines[-1][1] == "":
        lines.pop()
    resid = {}
    while lines:
        body = lines[-1][0]
        rm = re.match(r"§(\d+) ([-+.]+)$", body)
        if rm:
            resid[int(rm.group(1))] = rm.group(2)
            lines.pop()
        else:
            break
    # if the table part now ends with an added separator empty line, drop it
    if lines and lines[-1][0] == "":
        lines.pop()

    parsed = [(split_line(b, delim), e) for b, e in lines]
    rows = [(raw, e) for (raw, _val), e in parsed]
    rowvals = [val for (_raw, val), _e in parsed]
    header = rowvals[0]
    data = rowvals[1:]
    R = len(data)

    # resolve source columns on the reduced layout (dropped fields absent)
    dropped = sorted(d["field"] for d in items)
    def reduced_idx(finished_field):
        return finished_field - 1 - sum(1 for d in dropped if d < finished_field)

    finished_header = list(rows[0][0])
    finished = [list(r) for r, _e in rows[1:]]
    for d in items:
        if d["src_name"] is not None:
            if header.count(d["src_name"]) != 1:
                print("FAIL src-name-ambiguous")
                return 1
            src_red = header.index(d["src_name"])
        else:
            src_red = reduced_idx(d["src_field"])
        corr = resid.get(d["field"])
        if corr is not None and len(corr) != R:
            print("FAIL resid-length")
            return 1
        q = Decimal(1).scaleb(-d["scale"])
        values = []
        for i in range(R):
            x = Fraction(Decimal(data[i][src_red]))
            v = d["a"] * x + d["b"]
            vd = Decimal(v.numerator) / Decimal(v.denominator)
            mode = ROUND_DOWN if d["trunc"] else ROUND_HALF_UP
            r = vd.quantize(q, rounding=mode)
            if r == 0:
                r = abs(r)  # encoder semantics are integer ulps: no signed zero
            if corr is not None:
                c = corr[i]
                if c == "+":
                    r += q
                elif c == "-":
                    r -= q
                elif c != ".":
                    print("FAIL resid-char")
                    return 1
            values.append(f"{r:.{d['scale']}f}")
        pos = d["field"] - 1
        hdr_name = d["name"] if d["name"] is not None else ""
        finished_header.insert(pos, render_field(hdr_name, delim))
        for i in range(R):
            finished[i].insert(pos, values[i])

    out = []
    out.append(delim.join(finished_header) + rows[0][1])
    for i in range(R):
        out.append(delim.join(finished[i]) + rows[i + 1][1])
    result = "".join(out)
    if result == source:
        print("PASS byte-exact")
        return 0
    print("FAIL mismatch", len(result), len(source))
    for i, (x, y) in enumerate(zip(result.split("\n"), source.split("\n"))):
        if x != y:
            print("line", i, repr(x[:120]), "!=", repr(y[:120]))
            break
    return 1


if __name__ == "__main__":
    sys.exit(main())
