#!/usr/bin/env python3
# X52: independent DIPTYCHON decoder (CPython, no shared code with the TS
# codec). Reads a spec JSON + reduced text, re-renders the dump.
# Usage: diptychon_decode.py --spec s.json --reduced r.txt [--check orig.txt]
import argparse, json, sys

def gutter(bs):
    return ''.join(chr(b) if 0x20 <= b <= 0x7e else '.' for b in bs)

def offstr(spec, v):
    r = spec['offsetRadix']
    s = format(v, {8: 'o', 10: 'd', 16: 'x'}[r if r else 16])
    if spec['offsetUpper']: s = s.upper()
    return s.rjust(spec['offsetWidth'], '0')

def render_line(spec, bs, offv):
    n = spec['bytesPerLine']; g = gutter(bs)
    H = (lambda b: format(b, '02X')) if spec['upper'] else (lambda b: format(b, '02x'))
    if spec['format'] == 'od':
        off = '' if spec['offsetRadix'] == 0 else offstr(spec, offv)
        return off + ''.join(' ' + H(b) for b in bs) + ' ' * (3 * (n - len(bs))) + '  >' + g + '<'
    if spec['format'] == 'xxd':
        grp = spec['group']
        groups = [''.join(H(b) for b in bs[i:i+grp]) for i in range(0, len(bs), grp)]
        ng = -(-n // grp); w = ng * (2 * grp) + (ng - 1)
        return f"{offstr(spec, offv)}: {' '.join(groups).ljust(w)}  {g}"
    cells = ''
    for j in range(n):
        if j == 8: cells += ' '
        cells += (H(bs[j]) + ' ') if j < len(bs) else '   '
    return f"{offstr(spec, offv)}  {cells} |{g}|"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', required=True); ap.add_argument('--reduced', required=True)
    ap.add_argument('--check')
    a = ap.parse_args()
    spec = json.load(open(a.spec))
    eol = spec['eol']
    text = open(a.reduced, 'r', newline='').read()
    assert text.endswith(eol), 'no trailing eol'
    lines = text.split(eol)[:-1]
    out = []; cum = 0; prev = None; star = False
    for idx, line in enumerate(lines):
        is_last = idx == len(lines) - 1
        if spec['finalOffsetLine'] and is_last and line and all(c in '0123456789abcdefABCDEF' for c in line):
            out.append(offstr(spec, spec['offsetBase'] + cum)); prev = None; star = False; continue
        bs = None
        if spec['compact'] == 'pairs':
            toks = line.split(' ')
            if all(len(t) == 2 and all(c in '0123456789abcdef' for c in t) for t in toks) and line:
                bs = [int(t, 16) for t in toks]
        else:
            if line and len(line) % 2 == 0 and len(line) <= 2 * spec['bytesPerLine'] and all(c in '0123456789abcdef' for c in line):
                bs = [int(line[i:i+2], 16) for i in range(0, len(line), 2)]
        if bs is None:
            out.append(line); prev = None; star = False; continue
        full = len(bs) == spec['bytesPerLine']
        sq = full and prev is not None and (
            (spec['squeeze'] == 'identical' and bs == prev) or
            (spec['squeeze'] == 'zero' and all(b == 0 for b in bs) and all(b == 0 for b in prev)))
        if sq:
            if not star: out.append('*'); star = True
        else:
            out.append(render_line(spec, bs, spec['offsetBase'] + cum)); star = False; prev = bs
        cum += len(bs)
    result = eol.join(out) + eol
    if a.check:
        orig = open(a.check, 'rb').read()
        if result.encode() != orig:
            print('MISMATCH', file=sys.stderr); sys.exit(1)
        print('OK byte-exact')
    else:
        sys.stdout.write(result)

if __name__ == '__main__':
    main()
