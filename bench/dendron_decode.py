#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE DENDRON READER (CPython, no Node).

Written from the one-chat contract alone (line 1 of the message) and the
DAEDALUS/CHIRON reader it delegates to (bench/chiron_decode.py).

    ∴ paths: each line is a bash brace expression (text before { joins each comma item, in order; groups nest). Expand the braces after the other rules, one path per line.

Wire forms (first line decides):
    DEN_ESCAPE line ("∴ paths: literal payload follows") -> the rest is a DAEDALUS wire, output as is
    DEN_RULE line                                        -> the rest is a DAEDALUS wire of the TREE text;
                                                            expand it, then expand each brace line
    anything else                                        -> a DAEDALUS wire, output as is

Brace expression grammar (bash-like, the grammar the encoder writes):
    seq   := (literal | group)*
    group := '{' seq (',' seq)* '}'      alternatives in order; the product is left to right
A line is one seq; a stray ',' or '}' at top level is an error.

Usage:  python3 bench/dendron_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode  # noqa: E402

DEN_RULE = ('∴ paths: bash brace expressions ({a,b} = text before it + a, and + b; groups nest). Expand after other rules; one path per line.')
DEN_ESCAPE = '∴ paths: literal payload follows'


def _seq(s, p):
    acc = ['']
    while p[0] < len(s) and s[p[0]] not in ',}':
        if s[p[0]] == '{':
            p[0] += 1
            alts = []
            while True:
                alts.extend(_seq(s, p))
                if p[0] >= len(s):
                    raise ValueError('unterminated {')
                if s[p[0]] == ',':
                    p[0] += 1
                    continue
                p[0] += 1  # '}'
                break
            acc = [a + b for a in acc for b in alts]
        else:
            c = s[p[0]]
            p[0] += 1
            acc = [a + c for a in acc]
    return acc


def expand_line(line):
    p = [0]
    out = _seq(line, p)
    if p[0] != len(line):
        raise ValueError('stray } or , at top level')
    return out


def expand_tree(tree_text):
    out = []
    for line in tree_text.split('\n'):
        out.extend(expand_line(line))
    return '\n'.join(out)


def decode(wire):
    nl = wire.find('\n')
    first = wire if nl < 0 else wire[:nl]
    rest = '' if nl < 0 else wire[nl + 1:]
    if first == DEN_RULE:
        return expand_tree(chiron_decode(rest))
    if first == DEN_ESCAPE:
        return chiron_decode(rest)
    return chiron_decode(wire)


def main():
    cases_path, out_path = sys.argv[1], sys.argv[2]
    with open(cases_path, encoding='utf8') as f:
        cases = json.load(f)
    outs = []
    for w in cases:
        try:
            outs.append(decode(w))
        except Exception as e:  # report, do not hide
            outs.append('__ERROR__: ' + str(e))
    with open(out_path, 'w', encoding='utf8') as f:
        json.dump(outs, f, ensure_ascii=False)


if __name__ == '__main__':
    main()
