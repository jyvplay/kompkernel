#!/usr/bin/env python3
"""Independent CPython reader for ARITHMOS's visible one-chat contract.

After the established CHIRON/DAEDALUS decode, restore a well-formed
⟪X<ASCII digits>⟫ span by adding X's documented Unicode decimal base. Invalid
or literal spans are copied unchanged. This is intentionally separate from the
TypeScript implementation.
"""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK, ESCAPE = '◐', '◑'
OPEN, CLOSE = '⟪', '⟫'
BASE = {'A': 0x0660, 'P': 0x06F0, 'D': 0x0966, 'B': 0x09E6, 'T': 0x0E50}


def restore(s):
    result, i = [], 0
    while i < len(s):
        if s[i] != OPEN:
            result.append(s[i]); i += 1; continue
        tag = s[i + 1] if i + 1 < len(s) else ''
        end = s.find(CLOSE, i + 2)
        if tag not in BASE or end < 0:
            if end < 0:
                result.append(s[i]); i += 1
            else:
                result.append(s[i:end + 1]); i = end + 1
            continue
        global_form = i + 2 < len(s) and s[i + 2] == ':'
        body = s[i + (3 if global_form else 2):end]
        if not global_form and (not body or any(c < '0' or c > '9' for c in body)):
            result.append(s[i:end + 1]); i = end + 1; continue
        result.append(''.join(chr(BASE[tag] + ord(c) - ord('0')) if global_form and '0' <= c <= '9' else c for c in body))
        i = end + 1
    return ''.join(result)


def decode(wire):
    if not wire:
        return wire
    if wire[0] == MARK:
        return restore(chiron_decode.decode(wire[1:]))
    if wire[0] == ESCAPE:
        return chiron_decode.decode(wire[1:])
    return chiron_decode.decode(wire)


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8') as f:
        cases = json.load(f)
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        json.dump([decode(case) for case in cases], f, ensure_ascii=False)
