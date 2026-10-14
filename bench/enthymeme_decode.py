#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE ENTHYMEME READER (CPython, no Node).

Written from the in-band rule line alone:

    ∴ Stack frames: "at C.m(:N)" = "at C.m(S.java:N)", S = C after its last ".", cut at
      the first "$".
    ∴ Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces,
      "-" and "_", then spaces → "-".

The rest of the message is a DAEDALUS/CHIRON wire, decoded by the existing independent
reader bench/chiron_decode.py (identity when the wire does not start with §).

Usage:  python3 bench/enthymeme_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode  # noqa: E402

MARK = '∴ '
FRAME = re.compile(r'\bat\s+([\w$.<>/\[\]-]+)\.([\w$<>]+)\(:(\d+)\)')
ANCHOR = re.compile(r'\[([^\[\]\n]+)\]\(#\)')


def source_name(class_path):
    simple = class_path[class_path.rfind('.') + 1:]
    k = simple.find('$')
    return simple if k < 0 else simple[:k]


def slug(text):
    out = []
    for ch in text.lower():
        if ch == ' ':
            out.append('-')
        elif ch in '-_' or unicodedata.category(ch)[0] in ('L', 'N', 'M'):
            out.append(ch)
    return ''.join(out)


def decode(wire):
    if not wire.startswith(MARK):
        return chiron_decode(wire)
    k = wire.find('\n')
    clause, inner = (wire, '') if k < 0 else (wire[:k], wire[k + 1:])
    text = chiron_decode(inner)
    if '](#)' in clause:
        text = ANCHOR.sub(lambda m: '[%s](#%s)' % (m.group(1), slug(m.group(1))), text)
    if '(:N)' in clause:
        text = FRAME.sub(lambda m: m.group(0)[:m.start(1) - m.start(0)] + '%s.%s(%s.java:%s)' % (m.group(1), m.group(2), source_name(m.group(1)), m.group(3)), text)
    return text


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    json.dump([decode(w) for w in cases], open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
    print('decoded', len(cases))
