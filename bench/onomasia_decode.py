#!/usr/bin/env python3
"""
SECOND, INDEPENDENT ONOMASIA READER (CPython; no Node).

Whole message in:  [ONOMASIA contract line] + <DAEDALUS message>.
1. If line 1 is the ONOMASIA contract: drop it; keyed arm.
2. DAEDALUS message -> text via bench/gnomon_decode.py (decode_message).
3. Keyed arm only: per line, left to right. A slot is a run of ASCII digits or a MARK.
   key = the characters just before the slot in the already decoded prefix of this line,
   back to a space or a digit. j = count of earlier slots of this line with the same key.
   MARK with key K, occurrence j -> a + (a - b) where a = value of the slot (K, j) in
   line i-1, b = its value in line i-2. Canonical decimal output.
Usage: python3 bench/onomasia_decode.py messages.json out.json
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gnomon_decode import decode_message as daedalus_message  # noqa: E402

MARK = '\u207a'
CONTRACT = (MARK + ' = the number after the same text in the line above (that text is the characters '
            'just before it, back to a space or digit), plus the change from the line two above.')
SLOT = re.compile(r'[0-9]+|' + re.escape(MARK))


def key_before(s, end):
    b = end
    while b > 0 and s[b - 1] != ' ' and not ('0' <= s[b - 1] <= '9'):
        b -= 1
    return s[b:end]


def find(slots, key, j):
    for x in slots:
        if x[0] == key and x[1] == j:
            return x
    return None


def onomasia_expand(text):
    lines = text.split('\n')
    decoded = []   # per line: list of (key, j, value)
    out = []
    for i, line in enumerate(lines):
        res = []
        cur = ''     # the decoded prefix of this line
        mine = []
        seen = {}
        pos = 0
        for m in SLOT.finditer(line):
            cur += line[pos:m.start()]
            tok = m.group(0)
            key = key_before(cur, len(cur))
            occ = seen.get(key, 0)
            if tok == MARK:
                if i < 2:
                    raise ValueError('MARK in first two lines')
                a = find(decoded[i - 1] if i >= 1 else [], key, occ)
                b = find(decoded[i - 2] if i >= 2 else [], key, occ)
                if a is None or b is None:
                    raise ValueError('MARK without predecessor slots')
                v = a[2] + (a[2] - b[2])
                s = str(v)
            else:
                s = tok
                v = int(tok)
            cur += s
            mine.append((key, occ, v))
            seen[key] = occ + 1
            pos = m.end()
        cur += line[pos:]
        decoded.append(mine)
        out.append(cur)
    return '\n'.join(out)


def decode(msg):
    lines = msg.split('\n')
    keyed = bool(lines) and lines[0] == CONTRACT
    if keyed:
        msg = '\n'.join(lines[1:])
    text = daedalus_message(msg)
    if keyed:
        text = onomasia_expand(text)
    return text


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf8'))
    json.dump([decode(m) for m in cases], open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
