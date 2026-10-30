#!/usr/bin/env python3
"""Independent CPython decoder for the SYLLOGISMOS layer (X51).

Reads a reduced (post-parent-decode) table plus the JSON spec the encoder
derived from its in-band contract, reinserts the computed columns, and
optionally byte-compares against the original. Re-implemented from the
contract semantics, sharing no code with the TypeScript encoder.

Usage: syllogismos_decode.py --spec spec.json --reduced reduced.txt [--check original.txt]
"""
import argparse, json, sys
from fractions import Fraction

def split_csv_line(line, delim):
    fields, values, i, n = [], [], 0, len(line)
    while True:
        j = i; val = ''
        if j < n and line[j] == '"':
            j += 1; closed = False
            while j < n:
                if line[j] == '"':
                    if j + 1 < n and line[j+1] == '"': val += '"'; j += 2
                    else: j += 1; closed = True; break
                else: val += line[j]; j += 1
            if not closed: return None
        else:
            while j < n and line[j] != delim: val += line[j]; j += 1
        fields.append(line[i:j]); values.append(val)
        if j >= n: break
        if line[j] != delim: return None
        i = j + 1
        if i == n: fields.append(''); values.append(''); break
    return fields, values

def parse_table(text, delim, expect_cols):
    rows, eols = [], []
    raw = text.split('\n')
    for li, body0 in enumerate(raw):
        is_last = li == len(raw) - 1
        body, eol = body0, ('' if is_last else '\n')
        if not is_last and body.endswith('\r'): body, eol = body[:-1], '\r\n'
        if is_last and body == '': break
        if body == '': return None
        r = split_csv_line(body, delim)
        if r is None or len(r[1]) != expect_cols: return None
        rows.append(r); eols.append(eol)
    return rows, eols

def render_field(v, delim):
    if any(c in v for c in (delim, '"', '\n', '\r')):
        return '"' + v.replace('"', '""') + '"'
    return v

def parse_dec(s):
    import re
    m = re.fullmatch(r'([+-]?)(\d+)(?:\.(\d+))?', s)
    if not m: return None
    frac = m.group(3) or ''
    mag = int(m.group(2) + frac)
    return Fraction(-mag if m.group(1) == '-' else mag, 10 ** len(frac))

def render_rat(fr: Fraction, scale: int, mode: str):
    neg = fr < 0
    a = -fr if neg else fr
    scaled = a * (10 ** scale)
    q, r = divmod(scaled.numerator, scaled.denominator)
    if r:
        if mode == 'half-up' and 2 * r >= scaled.denominator: q += 1
        elif mode == 'ceil' and not neg: q += 1
    digits = str(q)
    if scale > 0:
        digits = digits.rjust(scale + 1, '0')
        digits = digits[:-scale] + '.' + digits[-scale:]
    return ('-' if neg and q != 0 else '') + digits

def render_exact(fr: Fraction):
    for s in range(13):
        if (fr * (10 ** s)).denominator == 1:
            return render_rat(fr, s, 'exact')
    return None

def render_scaled(fr, scale, mode):
    return render_exact(fr) if scale < 0 else render_rat(fr, scale, mode)

def compute(drop, i, nrows, get):
    k = drop['kind']
    if k == 'arith':
        A = parse_dec(get(drop['a'], i)); B = parse_dec(get(drop['b'], i))
        if A is None or B is None: return None
        op = drop['op']
        if op == '+': v = A + B
        elif op == '-': v = A - B
        elif op == '*': v = A * B
        else:
            if B == 0: return None
            v = A / B * (100 if op == 'pct' else 1)
        return render_scaled(v, drop['scale'], drop['mode'])
    if k == 'scaleK':
        A = parse_dec(get(drop['a'], i))
        if A is None: return None
        return render_scaled(A * Fraction(int(drop['kNum']), int(drop['kDen'])), drop['scale'], drop['mode'])
    if k == 'concat':
        out = ''
        for p in drop['parts']:
            if 'lit' in p: out += p['lit']
            else:
                v = get(p['col'], i)
                if v is None: return None
                out += v
        return out
    if k == 'split':
        av = get(drop['a'], i)
        if av is None: return None
        parts = av.split(drop['sep'])
        idx = drop['part'] if drop['part'] >= 0 else len(parts) + drop['part']
        return parts[idx] if 0 <= idx < len(parts) else None
    if k == 'case':
        av = get(drop['a'], i)
        return None if av is None else (av.upper() if drop['upper'] else av.lower())
    if k == 'lookup':
        av = get(drop['a'], i)
        if av is None: return None
        for kk, vv in drop['entries']:
            if kk == av: return vv
        return drop['defaultValue']
    if k == 'shiftdiff':
        if i == 0: return drop['first']
        A = parse_dec(get(drop['a'], i)); B = parse_dec(get(drop['a'], i - 1))
        if A is None or B is None: return None
        return render_scaled(A - B, drop['scale'], drop['mode'])
    if k == 'fwdeq':
        return drop['last'] if i == nrows - 1 else get(drop['a'], i + 1)
    raise ValueError(f'unknown kind {k}')

def restore(reduced, spec):
    delim = spec['delimiter']
    drops = spec['drops']
    dropped = {d['target'] for d in drops}
    parsed = parse_table(reduced, delim, spec['cols'] - len(drops))
    if parsed is None: raise ValueError('reduced text shape mismatch')
    rows, eols = parsed
    def survivor_of(col):
        return sum(1 for c in range(col) if c not in dropped)
    data = rows[1:]
    def get(col, row):
        return data[row][1][survivor_of(col)] if 0 <= row < len(data) else None
    out = []
    for li, (fields, _values) in enumerate(rows):
        raws = list(fields)
        inserts = []
        for d in drops:
            if li == 0: inserts.append((d['target'], spec['headerRaw'][d['target']]))
            else:
                v = compute(d, li - 1, len(data), get)
                if v is None: raise ValueError('computed field failed')
                inserts.append((d['target'], render_field(v, delim)))
        for target, raw in sorted(inserts):
            raws.insert(target, raw)
        out.append(delim.join(raws) + eols[li])
    return ''.join(out)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', required=True)
    ap.add_argument('--reduced', required=True)
    ap.add_argument('--check')
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding='utf8'))
    reduced = open(a.reduced, encoding='utf8').read()
    restored = restore(reduced, spec)
    if a.check:
        orig = open(a.check, 'rb').read()
        ok = restored.encode('utf8') == orig
        print(json.dumps({'exact': ok, 'bytes': len(orig)}))
        sys.exit(0 if ok else 1)
    sys.stdout.write(restored)

if __name__ == '__main__':
    main()
