#!/usr/bin/env python3
"""X53 independent TAXIS decoder: reads ONLY the contract line + reduced text.
Implements the contract as written: parse aligns/gaps/omitted-field rule from
the contract, find the header line, split rows, recompute omitted fields,
re-align under header words with push-right-whole."""
import re, sys
from fractions import Fraction
from decimal import Decimal, getcontext
getcontext().prec = 60

def fmt_scaled(q: int, digits: int) -> str:
    neg = q < 0; s = str(abs(q))
    if digits == 0: return ('-' if neg else '') + s
    s = s.rjust(digits + 1, '0')
    return ('-' if neg else '') + s[:-digits] + '.' + s[-digits:]

def render_pct(a_num: int, a_scale: int, t_num: int, t_scale: int, digits: int, mode: str) -> str:
    # value = 100 * (a_num/10^a_scale) / (t_num/10^t_scale)
    n = 100 * a_num * (10 ** t_scale); d = t_num * (10 ** a_scale)
    if d < 0: n, d = -n, -d
    scaled = n * (10 ** digits)
    if mode == 'trunc':
        q = abs(scaled) // d
        if scaled < 0: q = -q
    else:
        q = (2 * scaled + d) // (2 * d) if scaled >= 0 else -((2 * (-scaled) + d) // (2 * d))
    return fmt_scaled(q, digits)

def parse_num(s: str):
    m = re.fullmatch(r'(-?)(\d+)(?:\.(\d+))?', s)
    if not m: return None
    frac = m.group(3) or ''
    v = int(m.group(2) + frac)
    return (-v if m.group(1) == '-' else v), len(frac)

def decode(contract: str, reduced: str) -> str:
    eol = '\r\n' if '\r\n' in reduced else '\n'
    final = reduced.endswith(eol)
    lines = reduced.split(eol)
    if final: lines.pop()
    m = re.search(r'\(([LR]+): L/R = word start/end; min gaps (?:digitwise (\d+)|([\d ]+));', contract)
    assert m, 'aligns/gaps not found in contract'
    aligns = list(m.group(1))
    gaps = [int(c) for c in m.group(2)] if m.group(2) else [int(x) for x in m.group(3).split()]
    # header identification
    hm = re.search(r'the line starting "([^"]+)"', contract)
    if hm:
        hidx = next(i for i, l in enumerate(lines) if l.lstrip().startswith(hm.group(1)))
    else:
        hidx = 0
    header = lines[hidx]
    n = len(aligns)
    # header word spans: first n-1 words + rest
    words = list(re.finditer(r'\S+', header))
    spans = [(w.group(), w.start(), w.end()) for w in words[:n - 1]]
    last_start = words[n - 1].start()
    spans.append((header[last_start:], last_start, len(header)))
    names = [s[0] for s in spans]
    # omitted rules
    om = re.search(r'minus (.+?)\. Split at spaces', contract)
    assert om, 'omitted clause not found'
    clauses = om.group(1).split('; ')
    rules = []  # (col, fn(full_row)->str)
    def col_of(name: str) -> int:
        mm = re.fullmatch(r'column (\d+) \((.+)\)', name)
        if mm: return int(mm.group(1)) - 1
        return names.index(name)
    for cl in clauses:
        lhs, rhs = cl.split(' = ', 1)
        col = col_of(lhs.strip())
        m1 = re.fullmatch(r'100×(.+?)÷(\d+), (truncated|rounded) to (\d+) decimals?', rhs)
        m2 = re.fullmatch(r'100×(.+?)÷(.+?), (truncated|rounded) to (\d+) decimals?', rhs)
        m3 = re.fullmatch(r'the ceiling of 100×(.+?)÷\(\1\+(.+?)\)(, with a % sign)?', rhs)
        m4 = re.fullmatch(r'(.+?)([+−×÷])([^,]+?)(, rounded to (\d+) decimals?)?$', rhs)
        if m1:
            src = col_of(m1.group(1)); T = int(m1.group(2)); mode = 'trunc' if m1.group(3) == 'truncated' else 'round'; d = int(m1.group(4))
            rules.append((col, lambda row, src=src, T=T, mode=mode, d=d: render_pct(*parse_num(row[src]), T, 0, d, mode)))
        elif m3:
            src = col_of(m3.group(1)); oth = col_of(m3.group(2)); suf = m3.group(3) is not None
            def f3(row, src=src, oth=oth, suf=suf):
                A = int(row[src]); B = int(row[oth])
                c = 0 if A == 0 else -((-100 * A) // (A + B))
                return str(c) + ('%' if suf else '')
            rules.append((col, f3))
        elif m2 and not re.fullmatch(r'\d+', m2.group(2)):
            src = col_of(m2.group(1)); den = col_of(m2.group(2)); mode = 'trunc' if m2.group(3) == 'truncated' else 'round'; d = int(m2.group(4))
            rules.append((col, lambda row, src=src, den=den, mode=mode, d=d: render_pct(*parse_num(row[src]), *parse_num(row[den]), d, mode)))
        elif m4:
            a = col_of(m4.group(1)); op = m4.group(2); b = col_of(m4.group(3)); d = int(m4.group(5)) if m4.group(5) else None
            def f4(row, a=a, b=b, op=op, d=d):
                A = Decimal(row[a]); B = Decimal(row[b])
                v = A + B if op == '+' else A - B if op == '−' else A * B if op == '×' else A / B
                if d is None:
                    # match target scale from... exact mode: use plain formatting of exact decimal
                    s = format(v.normalize(), 'f')
                    return s
                q = v.quantize(Decimal(1).scaleb(-d))
                return format(q, 'f')
            rules.append((col, f4))
        else:
            raise AssertionError('unparsed clause: ' + cl)
    dropped = {c for c, _ in rules}
    kept = [j for j in range(n) if j not in dropped]
    out = list(lines)
    for li in range(hidx + 1, len(lines)):
        line = lines[li]
        # block continues while line tokenizes into >= len(kept) fields and is not blank
        if not line or line != line.rstrip(): break
        toks = list(re.finditer(r'\S+', line))
        if len(toks) < len(kept): break
        fields = []
        rest = line
        for _ in range(len(kept) - 1):
            sp = rest.find(' ')
            fields.append(rest if sp == -1 else rest[:sp])
            rest = '' if sp == -1 else rest[sp + 1:]
        fields.append(rest)
        full = [''] * n
        for j, fv in zip(kept, fields): full[j] = fv
        for c, fn in rules: full[c] = fn(full)
        # re-align
        buf = ''; prev_end = 0
        for j in range(n):
            c = full[j]
            hs, he = spans[j][1], spans[j][2]
            if aligns[j] == 'R':
                end = max(he, (prev_end + gaps[j - 1] + len(c)) if j > 0 else len(c))
                start = end - len(c)
            else:
                start = max(hs, (prev_end + gaps[j - 1]) if j > 0 else hs)
                end = start + len(c)
            buf += ' ' * (start - len(buf)) + c
            prev_end = end
        out[li] = buf
    return eol.join(out) + (eol if final else '')

if __name__ == '__main__':
    contract = open(sys.argv[1], encoding='utf-8').read()
    reduced = open(sys.argv[2], encoding='utf-8').read()
    sys.stdout.write(decode(contract, reduced))
