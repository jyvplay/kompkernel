#!/usr/bin/env python3
"""Independent ZYGON twin decoder (CPython, stdlib only).

Written from the in-band contract text + reduced text. Parses grouped
weighted sums, exceptions, trunc marks and lead-row restoration.
Plain number style only (German format covered by the TS suite).
Usage: py-decode.py <contract.txt> <reduced.txt> <source.txt>
"""
import re
import sys
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN
from fractions import Fraction

DELIM_WORDS = {"comma": ",", "tab": "\t", "semicolon": ";", "pipe": "|"}


def split_line(line, delim):
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
        i += 1
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


def parse_expr(expr):
    """Parse 'w×{a} + w×({b} + field 3) + (b)' into [(weight, ref)], intercept."""
    terms = []
    intercept = Fraction(0)
    # tokenize on top-level ' + '
    parts, depth, cur = [], 0, ""
    for ch in expr:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if depth == 0 and expr.startswith(" + ", len(cur)) and False:
            pass
        cur += ch
    # simpler: split on ' + ' at depth 0
    parts, depth, buf, i = [], 0, "", 0
    while i < len(expr):
        if depth == 0 and expr.startswith(" + ", i):
            parts.append(buf)
            buf = ""
            i += 3
            continue
        ch = expr[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        buf += ch
        i += 1
    parts.append(buf)
    for part in parts:
        part = part.strip()
        if re.fullmatch(r"\([^()]*\)", part):  # intercept (b)
            intercept = const_of(part[1:-1])
            continue
        m = re.fullmatch(r"([^×]+)×(.+)", part)
        if not m:
            raise ValueError("expr part: " + part)
        w = const_of(m.group(1))
        inner = m.group(2).strip()
        if inner.startswith("(") and inner.endswith(")"):
            refs = [r.strip() for r in inner[1:-1].split(" + ")]
        else:
            refs = [inner]
        for ref in refs:
            terms.append((w, ref))
    return terms, intercept


def main():
    contract_path, reduced_path, source_path = sys.argv[1:4]
    contract = open(contract_path, encoding="utf-8").read()
    reduced = open(reduced_path, encoding="utf-8").read()
    source = open(source_path, encoding="utf-8").read()

    m = re.match(r"ZYGON: after decoding below, in the (\w+)-separated table insert as header field and value in every row: (.*)\. Round each", contract)
    if not m:
        print("FAIL contract-shape")
        return 1
    delim = DELIM_WORDS[m.group(1)]
    items = []
    for part in m.group(2).split("; "):
        # strip exceptions suffix
        exc = {}
        em = re.search(r" \[except (.*)\]$", part)
        if em:
            for e in em.group(1).split(", "):
                mm = re.match(r"data row (\d+) = (.*)", e)
                exc[int(mm.group(1)) - 1] = mm.group(2)
            part = part[:em.start()]
        mm = re.match(r'field (\d+)(?: "([^"]*)"| \(empty name\))?: (.+) \((\d+) decimals\)(T?)$', part)
        if not mm:
            print("FAIL item-parse", part)
            return 1
        terms, b = parse_expr(mm.group(3))
        items.append(dict(field=int(mm.group(1)), name=mm.group(2), terms=terms, b=b,
                          scale=int(mm.group(4)), trunc=mm.group(5) == "T", exc=exc))
    items.sort(key=lambda d: d["field"])

    # lead-row header offset
    header_row = 0
    lead = {}  # (row, field) -> raw field text
    lm = re.search(r"The header is line (\d+); line\(s\) above it also regain the inserted fields: ([^.]*)\.", contract)
    if lm:
        header_row = int(lm.group(1)) - 1
        body = lm.group(2)
        if not body.startswith("(cells"):
            for piece in body.split(", line "):
                pm = re.match(r"(?:line )?(\d+) field (\d+) = (.*)", piece)
                if pm:
                    val = pm.group(3)
                    lead[(int(pm.group(1)) - 1, int(pm.group(2)))] = "" if val == "(empty)" else val

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
    header = rowvals[header_row]
    R = len(lines) - header_row - 1
    dropped = sorted(d["field"] for d in items)

    def reduced_idx(finished_field):
        return finished_field - 1 - sum(1 for d in dropped if d < finished_field)

    def ref_idx(ref):
        rm = re.fullmatch(r"\{([^}]*)\}", ref)
        if rm:
            name = rm.group(1)
            if header.count(name) != 1:
                raise ValueError("ambiguous ref")
            return header.index(name)
        fm = re.fullmatch(r"field (\d+)", ref)
        return reduced_idx(int(fm.group(1)))

    for d in items:
        term_idx = [(w, ref_idx(ref)) for w, ref in d["terms"]]
        q = Decimal(1).scaleb(-d["scale"])
        mode = ROUND_DOWN if d["trunc"] else ROUND_HALF_UP
        pos = d["field"] - 1
        hdr = d["name"] if d["name"] is not None else ""
        finished[header_row].insert(pos, render_field(hdr, delim))
        for (lrow, lfield), raw in sorted(lead.items()):
            if lfield == d["field"]:
                finished[lrow].insert(pos, raw)
        for i in range(R):
            r = i + header_row + 1
            if i in d["exc"]:
                finished[r].insert(pos, d["exc"][i])
                continue
            acc = d["b"]
            for w, sidx in term_idx:
                acc += w * Fraction(Decimal(rowvals[r][sidx]))
            vd = (Decimal(acc.numerator) / Decimal(acc.denominator)).quantize(q, rounding=mode)
            if vd == 0:
                vd = abs(vd)
            finished[r].insert(pos, f"{vd:.{d['scale']}f}")

    out = "".join(delim.join(finished[i]) + lines[i][1] for i in range(len(lines)))
    if out == source:
        print("PASS byte-exact")
        return 0
    print("FAIL mismatch", len(out), len(source))
    for i, (x, y) in enumerate(zip(out.split("\n"), source.split("\n"))):
        if x != y:
            print("line", i, repr(x[:140]), "!=", repr(y[:140]))
            break
    return 1


if __name__ == "__main__":
    sys.exit(main())
