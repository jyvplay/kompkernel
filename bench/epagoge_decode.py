#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE EPAGOGE READER (CPython, no Node).

Written from the in-band sentence line alone. The sentences carry their parameters:

    ∴ Stack frames: "at C.m(:N)" = "at C.m(S.kt:N)" and "at C.m(;N)" = "at C.m(S.java:N)",
      S = C after its last ".", cut at the first "$"; for ":" a final "Kt" of S is dropped.
    ∴ Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces,
      "-" and "_", then spaces → "-".                      (or:  s = t with every space written "%20".)
    ∴ Release links: "[V]:" alone on a line = "[V]: <stem><p>P...<p>V", P = the V of the
      next "[P]:" line.

Several sentences may share the line; they are undone in reverse order. The rest of the
message is a DAEDALUS/CHIRON wire, decoded by the existing independent reader
bench/chiron_decode.py (identity when the wire does not start with §).

Usage:  python3 bench/epagoge_decode.py cases.json out.json
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
SPLIT = re.compile(r'(?<=\.) (?=(?:Stack frames|Links|Release links):)')
FORM = re.compile(r'"at C\.m\(([:;])N\)" = "at C\.m\(S\.(\w+):N\)"')
KT = re.compile(r'for "([:;])" a final "Kt" of S is dropped')
RELEASE = re.compile(r'^Release links: "\[V\]:" alone on a line = "\[V\]: (.*?)P\.\.\.(\S*?)V", P = the V of the next "\[P\]:" line\.$')
ANCHOR = re.compile(r'\[([^\[\]\n]+)\]\(#\)')
GITHUB_CLAUSE = 'Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces, "-" and "_", then spaces → "-".'
PERCENT_CLAUSE = 'Links: "[t](#)" = "[t](#s)", s = t with every space written "%20".'


def simple_name(class_path):
    simple = class_path[class_path.rfind('.') + 1:]
    k = simple.find('$')
    return simple if k < 0 else simple[:k]


def github_slug(text):
    out = []
    for ch in text.lower():
        if ch == ' ':
            out.append('-')
        elif ch in '-_' or unicodedata.category(ch)[0] in ('L', 'N', 'M'):
            out.append(ch)
    return ''.join(out)


def undo_frames(clause, text):
    forms = {}
    for ch, ext in FORM.findall(clause):
        forms[ch] = [ext, False]
    m = KT.search(clause)
    if m and m.group(1) in forms:
        forms[m.group(1)][1] = True
    if not forms:
        return text
    pat = re.compile(r'\bat\s+([\w$.<>/\[\]-]+)\.([\w$<>]+)\(([' + re.escape(''.join(forms)) + r'])(\d+)\)')

    def fix(m):
        cls, meth, ch, line = m.groups()
        ext, facade = forms[ch]
        s = simple_name(cls)
        if facade and len(s) > 2 and s.endswith('Kt'):
            s = s[:-2]
        return m.group(0)[:m.start(1) - m.start(0)] + '%s.%s(%s.%s:%s)' % (cls, meth, s, ext, line)
    return pat.sub(fix, text)


def undo_anchors(clause, text):
    if clause == GITHUB_CLAUSE:
        slug = github_slug
    elif clause == PERCENT_CLAUSE:
        slug = lambda t: t.replace(' ', '%20')  # noqa: E731
    else:
        return text
    return ANCHOR.sub(lambda m: '[%s](#%s)' % (m.group(1), slug(m.group(1))), text)


def undo_release(clause, text):
    m = RELEASE.match(clause)
    if not m:
        return text
    stem_prefix, prefix = m.group(1), m.group(2)
    if not stem_prefix.endswith(prefix):
        return text
    stem = stem_prefix[:len(stem_prefix) - len(prefix)]
    lines = text.split('\n')
    next_v = None
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i]
        mm = re.match(r'^\[([^\]\n]+)\]:$', line)
        if mm:
            if next_v is not None:
                lines[i] = '[%s]: %s%s%s...%s%s' % (mm.group(1), stem, prefix, next_v, prefix, mm.group(1))
            next_v = mm.group(1)
            continue
        mm = re.match(r'^\[([^\]\n]+)\]: (\S+)$', line)
        if mm:
            next_v = mm.group(1)
    return '\n'.join(lines)


def decode(wire):
    if not wire.startswith(MARK):
        return chiron_decode(wire)
    k = wire.find('\n')
    clause_line, inner = (wire, '') if k < 0 else (wire[:k], wire[k + 1:])
    text = chiron_decode(inner)
    clauses = SPLIT.split(clause_line[len(MARK):])
    for clause in reversed(clauses):
        if clause.startswith('Stack frames:'):
            text = undo_frames(clause, text)
        elif clause.startswith('Links:'):
            text = undo_anchors(clause, text)
        elif clause.startswith('Release links:'):
            text = undo_release(clause, text)
    return text


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    json.dump([decode(w) for w in cases], open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
    print('decoded', len(cases))
