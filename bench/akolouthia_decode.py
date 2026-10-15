#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE AKOLOUTHIA READER (CPython, no Node).

Input is the WHOLE one-chat message as the reader sees it:

    [AKOLOUTHIA contract line]               (present only in the progression arm)
    <DAEDALUS message: contract line + wire, or raw text>

Procedure (the same as the contract sentence says):
  1. If the first line is the AKOLOUTHIA contract, drop it and remember the progression arm.
  2. Read the DAEDALUS message with bench/gnomon_decode.py (its decode_message handles raw,
     CHIRON, and GRAMMA messages; the rule sentences are absent here).
  3. Progression arm only: walk each line left to right. Digit runs and MARK characters each
     take the next position k. A MARK at position k of line i is
         value(line i-1, k) + (value(line i-1, k) - value(line i-2, k))
     written in canonical decimal. Lines are read in order.

Usage:  python3 bench/akolouthia_decode.py messages.json out.json
        messages.json = list of whole messages; out.json = list of decoded texts.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gnomon_decode import decode_message as daedalus_message  # noqa: E402

MARK = '\u207a'  # ⁺
CONTRACT = (MARK + ' = the number at the same position in the line above, '
            'plus the change from the line two above.')
SLOT = re.compile(r'[0-9]+|' + re.escape(MARK))   # ASCII digits only, like JS /\d+/


def progression_expand(text):
    lines = text.split('\n')
    values = []          # numeric values of the numbers of each decoded line, in position order
    out = []
    for i, line in enumerate(lines):
        res = []
        nums = []
        k = 0
        pos = 0
        for m in SLOT.finditer(line):
            res.append(line[pos:m.start()])
            tok = m.group(0)
            if tok == MARK:
                if i < 2:
                    raise ValueError('MARK in the first two lines')
                if k >= len(values[i - 1]) or k >= len(values[i - 2]):
                    raise ValueError('MARK without predecessor numbers')
                a = values[i - 1][k]
                b = values[i - 2][k]
                v = a + (a - b)
                s = str(v)
            else:
                s = tok
                v = int(tok)
            res.append(s)
            nums.append(v)
            k += 1
            pos = m.end()
        res.append(line[pos:])
        values.append(nums)
        out.append(''.join(res))
    return '\n'.join(out)


def decode(msg):
    lines = msg.split('\n')
    progression = bool(lines) and lines[0] == CONTRACT
    if progression:
        msg = '\n'.join(lines[1:])
    text = daedalus_message(msg)
    if progression:
        text = progression_expand(text)
    return text


def main():
    cases = json.load(open(sys.argv[1], encoding='utf8'))
    out = [decode(m) for m in cases]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)


if __name__ == '__main__':
    main()
