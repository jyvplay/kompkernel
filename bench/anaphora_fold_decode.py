#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE ANAPHORA READER (CPython, no Node).

Input: list of WHOLE one-chat messages. A message is either
  (a) ANAPHORA contract line + DAEDALUS message   (fold arm), or
  (b) a plain DAEDALUS message                    (identity arm).

Procedure (the same as the contract sentence says):
  1. If the first line is the ANAPHORA contract, drop it and remember the fold arm.
  2. Decode the DAEDALUS message with bench/gnomon_decode.py (decode_message).
  3. Fold arm only: walk the decoded lines in order. A line matching  @k,n,m|X  is the
     decoded line k lines above (k >= 1, k <= current index), keeping its first n and last
     m space-separated fields, with the fields of X (space-joined; empty X = none) between.
     Every other line is literal.

Usage:  python3 bench/anaphora_fold_decode.py messages.json out.json
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gnomon_decode import decode_message as daedalus_message  # noqa: E402

CONTRACT = ('A line "@k,n,m|X" is the decoded line k lines above it, keeping its first n and last m '
            'space-separated fields, with the fields of X (space-joined; empty X = none) between them; '
            'every other line is literal.')
HEADER = re.compile(r'^@([0-9]+),([0-9]+),([0-9]+)\|')


def anaphora_expand(wire):
    decoded = []
    for w in wire.split('\n'):
        h = HEADER.match(w)
        if not h:
            decoded.append(w)
            continue
        k, n, m = int(h.group(1)), int(h.group(2)), int(h.group(3))
        x = w[h.end():]
        i = len(decoded)
        if k < 1 or k > i:
            raise ValueError(f'bad reference k={k} at line {i}')
        r = decoded[i - k].split(' ')
        if n > len(r) or m > len(r):
            raise ValueError(f'field count out of range at line {i}')
        mid = [] if x == '' else x.split(' ')
        decoded.append(' '.join(r[:n] + mid + r[len(r) - m:]))
    return '\n'.join(decoded)


def decode_whole(message):
    lines = message.split('\n', 1)
    if lines[0] == CONTRACT:
        body = lines[1] if len(lines) > 1 else ''
        return anaphora_expand(daedalus_message(body))
    return daedalus_message(message)


if __name__ == '__main__':
    msgs = json.load(open(sys.argv[1], encoding='utf8'))
    out = [decode_whole(m) for m in msgs]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    print(f'decoded {len(out)} messages')
