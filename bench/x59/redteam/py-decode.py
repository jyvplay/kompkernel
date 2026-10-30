#!/usr/bin/env python3
"""Independent BATHMOS twin decoder (CPython, stdlib only).

Written from the in-band contract text + reduced text. Handles the rank /
percent-rank / cume-dist / ntile / share families in plain number style
(German style is covered by the TS suite, as in prior twins).
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


def fmt(fr, scale, trunc):
    q = Decimal(1).scaleb(-scale)
    d = (Decimal(fr.numerator) / Decimal(fr.denominator)).quantize(
        q, rounding=ROUND_DOWN if trunc else ROUND_HALF_UP)
    if d == 0:
        d = abs(d)
    return f"{d:.{scale}f}"


def main():
    contract = open(sys.argv[1], encoding="utf-8").read()
    reduced = open(sys.argv[2], encoding="utf-8").read()
    source = open(sys.argv[3], encoding="utf-8").read()

    m = re.match(r"BATHMOS: after decoding below, in the (\w+)-separated table insert as header field and value in every row: (.*)\. Round each", contract)
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

    def ref_idx(ref, dropped_before):
        rm = re.fullmatch(r"\{([^}]*)\}", ref)
        if rm:
            name = rm.group(1)
            if header.count(name) != 1:
                raise ValueError("ambiguous ref " + ref)
            return header.index(name)
        fm = re.fullmatch(r"field (\d+)", ref)
        # finished-table index -> reduced index (single-drop twin scope: all
        # drops in a message are computed before any insertion, so subtract
        # the number of dropped fields before it)
        return int(fm.group(1)) - 1 - dropped_before(int(fm.group(1)) - 1)

    items = []
    # split items on '; field ' boundaries
    body = m.group(2)
    parts = re.split(r"; (?=field \d+ )", body)
    dropped_fields = []
    for part in parts:
        mm = re.match(r'field (\d+)(?: "([^"]*)"| \(empty name\))?: (.*)$', part)
        if not mm:
            print("FAIL item-parse", part); return 1
        dropped_fields.append(int(mm.group(1)) - 1)
        items.append((int(mm.group(1)) - 1, mm.group(2), mm.group(3)))

    def dropped_before(finished_col):
        return sum(1 for d in dropped_fields if d < finished_col)

    def col_vals(ref):
        j = ref_idx(ref, dropped_before)
        return [rowvals[r + 1][j] for r in range(R)]

    def key_of(expr):
        if "/" in expr:
            a, b = expr.split("/", 1)
            va, vb = col_vals(a), col_vals(b)
            return [Fraction(Decimal(x)) / Fraction(Decimal(y)) for x, y in zip(va, vb)]
        v = col_vals(expr)
        try:
            return [Fraction(Decimal(x)) for x in v]
        except Exception:
            return v  # text key

    computed = {}
    for col, name, law in items:
        exc = {}
        em = re.search(r" \[except (.*)\]$", law)
        if em:
            for e in em.group(1).split(", "):
                emm = re.match(r"data row (\d+) = (.*)", e)
                exc[int(emm.group(1)) - 1] = emm.group(2)
            law = law[:em.start()]

        pm = re.match(r"(?:within each (\{[^}]*\}|field \d+) group|over all rows),? (.*)$", law)
        partition = None
        rest = law
        if law.startswith("within each ") or law.startswith("over all rows"):
            if pm and pm.group(1):
                partition = col_vals(pm.group(1))
            rest = pm.group(2) if pm else law
        else:
            # share form carries the partition inside the denominator parens
            wm = re.search(r"within each (\{[^}]*\}|field \d+) group", law)
            if wm:
                partition = col_vals(wm.group(1))
        groups = {}
        for i in range(R):
            groups.setdefault(partition[i] if partition else "", []).append(i)

        vals = [None] * R
        sm = re.match(r"(100 × )?(\{[^}]*\}|field \d+) / \((?:the sum of|the largest) .*?\) \((\d+) decimals(T?)\)$", law)
        if sm and "ordering rows" not in law:
            factor = 100 if sm.group(1) else 1
            src = [Fraction(Decimal(x)) for x in col_vals(sm.group(2))]
            agg_sum = "the sum of" in law
            scale, trunc = int(sm.group(3)), sm.group(4) == "T"
            for g in groups.values():
                agg = sum(src[i] for i in g) if agg_sum else max(src[i] for i in g)
                for i in g:
                    vals[i] = fmt(factor * src[i] / agg, scale, trunc)
        else:
            om = re.search(r"(?:ordering rows by|rank by|ordering by) (.+)$", rest)
            if not om:
                # share form carries partition inside parens already handled;
                # ordering forms all contain 'ordering rows by'
                print("FAIL law-parse", law); return 1
            ord_expr = om.group(1)
            for cut in (", ties", ") /", " minus", " \u00d7 100", " ("):
                ci = ord_expr.find(cut)
                if ci >= 0:
                    ord_expr = ord_expr[:ci]
            # ntile law appends ': split...' or ': bucket = ...' after ordering
            colon = ord_expr.find(": ")
            ntile_tail = None
            if colon >= 0:
                ntile_tail = ord_expr[colon + 2:]
                ord_expr = ord_expr[:colon]
            key_specs = []
            for piece in ord_expr.split(", then "):
                km = re.match(r"(.+) (ascending|descending)$", piece)
                key_specs.append((key_of(km.group(1)), km.group(2) == "descending"))
            for g in groups.values():
                order = sorted(g, key=lambda i: i)  # stable base
                for kv, desc in reversed(key_specs):
                    order.sort(key=lambda i, kv=kv: kv[i], reverse=desc)
                n = len(order)
                primary = key_specs[0][0]
                comp, dense = 0, 0
                for pos, i in enumerate(order):
                    if pos == 0 or primary[i] != primary[order[pos - 1]]:
                        comp, dense = pos + 1, dense + 1
                    if "competition rank" in rest and "minus 1" not in rest:
                        vals[i] = str(comp)
                    elif "dense rank" in rest:
                        vals[i] = str(dense)
                    elif "ordinal rank" in rest:
                        vals[i] = str(pos + 1)
                    elif "minus 1) / (group size minus 1)" in rest:
                        dm = re.search(r"\((\d+) decimals(T?)\)", rest)
                        factor = 100 if "× 100" in rest else 1
                        vals[i] = fmt(Fraction(factor * (comp - 1), n - 1) if n > 1 else Fraction(0),
                                      int(dm.group(1)), dm.group(2) == "T")
                    elif "ranked at-or-before" in rest:
                        dm = re.search(r"\((\d+) decimals(T?)\)", rest)
                        factor = 100 if "× 100" in rest else 1
                        end = pos + 1
                        while end < n and primary[order[end]] == primary[i]:
                            end += 1
                        vals[i] = fmt(Fraction(factor * end, n), int(dm.group(1)), dm.group(2) == "T")
                    elif ntile_tail is not None:
                        km2 = re.search(r"into (\d+) buckets", ntile_tail) or re.search(r"ordinal x (\d+)", ntile_tail)
                        k = int(km2.group(1))
                        if "as equal as possible" in ntile_tail:
                            base, rem = divmod(n, k)
                            big = rem * (base + 1)
                            b = pos // (base + 1) + 1 if pos < big else rem + (pos - big) // max(1, base) + 1
                        else:
                            b = min(k, -(-((pos + 1) * k) // n))
                        lm = re.search(r"buckets labelled (.+)$", ntile_tail)
                        vals[i] = lm.group(1).split(", ")[b - 1] if lm else str(b)
                    else:
                        print("FAIL family", rest); return 1
        for r, f in exc.items():
            vals[r] = f
        computed[col] = (name, vals)

    # insert in ascending finished order using live positions
    # recompute: reduced table lacks all dropped fields; inserting ascending
    # by finished col, the live index equals finished col (since all lower
    # dropped fields are already re-inserted)
    for col in sorted(computed):
        name, vals = computed[col]
        finished[0].insert(col, render_field(name or "", delim))
        for i in range(R):
            v = vals[i]
            finished[i + 1].insert(col, v if re.fullmatch(r"-?\d+(\.\d+)?", v or "") else render_field(v, delim))

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
