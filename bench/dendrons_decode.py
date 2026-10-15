#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE DENDRON-S READER (CPython, no Node).

Written from the one-chat contract alone (line 1 of the message) and the
DAEDALUS/CHIRON reader it delegates to (bench/chiron_decode.py).

Wire forms (first line decides):
    DENS_ESCAPE line  -> the rest is a DAEDALUS wire, output as is
    DENS_RULE line    -> the rest is a DAEDALUS wire of the TREE text; expand it
    DENS_RULE_V line  -> same as DENS_RULE, and a line starting with "!" is literal:
                         drop that one "!", output the rest unchanged
    anything else     -> a DAEDALUS wire, output as is

A tree line is one brace seq (text, then {a,b} = text + a and text + b; groups nest).
A stray ',' or '}' at top level is an error. Lines are expanded in order, joined by \n.

Usage:  python3 bench/dendrons_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode  # noqa: E402

DENS_RULE = ('∴ lines: bash brace expressions ({a,b} = text before it + a, and + b; groups nest). Expand after other rules; one line per result.')
DENS_RULE_V = DENS_RULE + ' A line starting with ! is literal: drop that !, keep the rest.'
DENS_ESCAPE = '∴ lines: literal payload follows'
DENS2_RULE = '∴ lines: bash brace expansion; one result per line.'
DENS2_RULE_V = '∴ lines: bash brace expansion; one result per line. A line starting with ! is literal: drop the !.'


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
    if line.startswith('!'):
        return [line[1:]]
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
    if first in (DENS_RULE, DENS_RULE_V, DENS2_RULE, DENS2_RULE_V):
        return expand_tree(chiron_decode(rest))
    if first == DENS_ESCAPE:
        return chiron_decode(rest)
    return chiron_decode(wire)


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf8'))
    out = []
    for w in cases:
        try:
            out.append(decode(w))
        except Exception as e:  # a reader error is a failure, recorded as such
            out.append('<<ERROR: ' + str(e) + '>>')
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)
    print('decoded', len(out))
