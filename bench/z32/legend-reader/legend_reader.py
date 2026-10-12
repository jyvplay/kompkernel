#!/usr/bin/env python3
"""Z32 independent legend-only reader for the VXC wire.

It implements ONLY the rules stated in the wire's own legend line (no TypeScript, no decoder code):
  legend: '# VXC: header lines "XT": bare X means T (T may hold other X); ~~ ~, ~N newline, ~R CR; ]] ends'
  1. The wire starts with the sentinel line '[[VXC'. The next line is the legend.
  2. Header lines run until the line ']]'. A header line is ONE character X followed by T.
  3. In T, '~~' is '~', '~N' is a newline, '~R' is a carriage return.
  4. A bare X (an alias character defined in the header) stands for its T. T may hold other aliases; expand them.
  5. The body is everything after ']]'. In the body, '~~' is '~' and each bare alias stands for its (expanded) T.
This is an evidence check that the legend is sufficient for a careful reader. It is NOT a test of any language model.
"""
import json, sys

def unesc(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == '~' and i + 1 < len(s):
            n = s[i + 1]
            if n == '~': out.append('~')
            elif n == 'N': out.append('\n')
            elif n == 'R': out.append('\r')
            else: raise ValueError('bad header escape ~' + n)
            i += 2
        else:
            out.append(c); i += 1
    return ''.join(out)

NESTED_REFS = [0]

def read_wire(wire):
    lines = wire.split('\n')
    if lines[0] != '[[VXC':
        return wire  # no sentinel: the text is the message itself
    i = 2  # skip sentinel and legend line
    raw = {}
    while lines[i] != ']]':
        ln = lines[i]
        raw[ln[0]] = unesc(ln[1:])  # the header value is unescaped once, then nested aliases are expanded
        i += 1
    NESTED_REFS[0] += sum(1 for v in raw.values() for c in v if c in raw)
    memo = {}
    def expand(k, depth=0):
        if k in memo: return memo[k]
        if depth > 64: raise ValueError('alias cycle')
        out = []
        for c in raw[k]:
            out.append(expand(c, depth + 1) if c in raw else c)
        memo[k] = ''.join(out)
        return memo[k]
    for k in raw: expand(k)
    body = '\n'.join(lines[i + 1:])
    out, j = [], 0
    while j < len(body):
        c = body[j]
        if c == '~':
            if j + 1 < len(body) and body[j + 1] == '~': out.append('~'); j += 2; continue
            raise ValueError('bad body escape')
        out.append(memo[c] if c in memo else c)
        j += 1
    return ''.join(out)

if __name__ == '__main__':
    path = sys.argv[1]
    total = ok = nested_docs = nested_ok = 0
    for line in open(path, encoding='utf8'):
        rec = json.loads(line)
        total += 1
        got = read_wire(rec['wire'])
        good = got == rec['original']
        ok += good
        if not good:
            print('MISMATCH', rec['file'])
    print(f'legend-only reader: {ok}/{total} exact; nested alias references read from headers: {NESTED_REFS[0]}')
