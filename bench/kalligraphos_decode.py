#!/usr/bin/env python3
"""Independent CPython KALLIGRAPHOS reader from the inline wire contract."""
import json
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
import chiron_decode

MARK, ESCAPE, OPEN, CLOSE = '✅', '✔', '⌁', '⌂'
# id: upper base, lower base, optional digit base
STYLES = {
    'B': (0x1D400, 0x1D41A, 0x1D7CE), 'I': (0x1D468, 0x1D482, None),
    'S': (0x1D5A0, 0x1D5BA, 0x1D7E2), 'F': (0x1D5D4, 0x1D5EE, 0x1D7EC),
    'T': (0x1D608, 0x1D622, None), 'X': (0x1D63C, 0x1D656, None),
    'M': (0x1D670, 0x1D68A, 0x1D7F6),
}


def render(body, style):
    upper, lower, digit = STYLES[style]
    result = []
    for c in body:
        if 'A' <= c <= 'Z': result.append(chr(upper + ord(c) - ord('A')))
        elif 'a' <= c <= 'z': result.append(chr(lower + ord(c) - ord('a')))
        elif digit is not None and '0' <= c <= '9': result.append(chr(digit + ord(c) - ord('0')))
        else: result.append(c)
    return ''.join(result)


def restore(s):
    result, i = [], 0
    while i < len(s):
        if s[i] != OPEN:
            result.append(s[i]); i += 1; continue
        end = s.find(CLOSE, i + 1)
        if end < 0 or i + 2 >= end or s[i + 2] != ':' or s[i + 1] not in STYLES:
            result.append(s[i] if end < 0 else s[i:end + 1])
            i = i + 1 if end < 0 else end + 1
            continue
        result.append(render(s[i + 3:end], s[i + 1]))
        i = end + 1
    return ''.join(result)


def decode(wire):
    if not wire: return wire
    if wire[0] == MARK: return restore(chiron_decode.decode(wire[1:]))
    if wire[0] == ESCAPE: return chiron_decode.decode(wire[1:])
    return chiron_decode.decode(wire)

if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8') as f: cases = json.load(f)
    with open(sys.argv[2], 'w', encoding='utf-8') as f: json.dump([decode(x) for x in cases], f, ensure_ascii=False)
