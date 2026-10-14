#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE ELLEIPSIS READER (CPython, no Node).

Written from the in-band sentence line alone.  The line starts with "○ " and carries one or
more sentences, applied in the order written, AFTER the rest of the message has been decoded
as a DAEDALUS/CHIRON wire (bench/chiron_decode.py; identity when it does not start with §):

    Each line[ beginning with "ii" | after the first] lost its 4th space-separated field,
      "amd64" followed by 8 spaces[, except lines whose 4th field is "all"]; put it back.
    Each line lost "node_modules/" from the start of its last space-separated field[, except
      lines whose last field starts with "/"]; put it back.
    Empty cells (comma-separated) hold the column's default: "type" = "small_airport",
      5th column = "NA".

Field positions are 1-based ("last" = the last field).  For space-separated lines the fields are
the maximal runs of non-blank characters; the blank runs between them are kept verbatim.  The
exception names the field the reader SEES at that position: lines where it holds are complete
and are left alone.

Usage:  python3 bench/elleipsis_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode  # noqa: E402

MARK = '○ '
DELIM = {'comma': ',', 'semicolon': ';', 'tab': '\t'}
QUOTED = r'"((?:[^"\\]|\\.)*)"'


def split_ws(line):
    """line = lead + f0 + s0 + f1 + ... + f(n-1) + trail"""
    m = re.match(r'[ \t]*', line)
    lead = m.group(0)
    rest = line[len(lead):]
    parts = re.findall(r'([^ \t]+)([ \t]*)', rest)
    f = [p[0] for p in parts]
    s = [p[1] for p in parts]
    trail = s[-1] if s else ''
    if s:
        s = s[:-1]
    return lead, f, s, trail


def join_ws(lead, f, s, trail):
    out = lead
    for i, x in enumerate(f):
        out += x + (s[i] if i < len(s) else '')
    return out + trail


def parse_pos(tok):
    return -1 if tok == 'last' else int(re.match(r'\d+', tok).group(0))


def parse_pad(phrase):
    m = re.fullmatch(r'a space', phrase)
    if m:
        return ' '
    m = re.fullmatch(r'(\d+) spaces', phrase)
    if m:
        return ' ' * int(m.group(1))
    m = re.fullmatch(r'a tab', phrase)
    if m:
        return '\t'
    m = re.fullmatch(r'(\d+) tabs', phrase)
    if m:
        return '\t' * int(m.group(1))
    m = re.fullmatch(QUOTED, phrase)
    if m:
        return m.group(1)
    raise ValueError('pad: ' + phrase)


def parse_except(tail):
    m = re.search(r', except lines whose (?:\d+(?:st|nd|rd|th)|last) field (?:is ((?:' + QUOTED + r'(?: or )?)+)|starts with "(.)"|(starts|does not start) with a digit)$', tail)
    if not m:
        return ('none',), tail
    rest = tail[:m.start()]
    if m.group(1):
        return ('is', [v for v in re.findall(QUOTED, m.group(1))]), rest
    if m.group(3):
        return ('starts', m.group(3)), rest
    return ('digit', m.group(4) == 'does not start'), rest


def excepted(field, ex):
    kind = ex[0]
    if kind == 'none':
        return False
    if kind == 'is':
        return field in ex[1]
    if kind == 'starts':
        return field.startswith(ex[1])
    return bool(re.match(r'[0-9]', field)) != ex[1]


def parse_sentence(sentence):
    m = re.fullmatch(r"Empty cells \((comma|semicolon|tab)-separated\) hold the column's default: (.+)\.", sentence)
    if m:
        pairs = []
        for x in re.finditer(r'(?:' + QUOTED + r'|(\d+)(?:st|nd|rd|th) column) = ' + QUOTED, m.group(2)):
            pairs.append((x.group(1), int(x.group(2)) if x.group(2) else None, x.group(3)))
        return {'form': 'cells', 'delim': m.group(1), 'pairs': pairs}
    if not sentence.endswith('; put it back.'):
        raise ValueError('sentence: ' + sentence)
    body = sentence[:-len('; put it back.')]
    sm = re.match(r'Each line(?: beginning with ' + QUOTED + r'| after the first)?', body)
    if sm.group(1) is not None:
        scope = ('first', sm.group(1))
    elif sm.group(0).endswith('after the first'):
        scope = ('afterFirst',)
    else:
        scope = ('all',)
    ex, rest = parse_except(body[sm.end():])
    m = re.fullmatch(r' lost ' + QUOTED + r' from the start of its (\d+(?:st|nd|rd|th)|last) (space|comma|semicolon|tab)-separated field', rest)
    if m:
        return {'form': 'prefix', 'delim': m.group(3), 'k': parse_pos(m.group(2)), 'value': m.group(1), 'scope': scope, 'except': ex}
    m = re.fullmatch(r' lost its (\d+(?:st|nd|rd|th)|last) (space|comma|semicolon|tab)-separated field, ' + QUOTED + r' followed by (.+)', rest)
    if m:
        return {'form': 'field', 'delim': m.group(2), 'k': parse_pos(m.group(1)), 'value': m.group(3), 'pad': parse_pad(m.group(4)), 'scope': scope, 'except': ex}
    raise ValueError('sentence: ' + sentence)


def in_scope(line, scope, i):
    if scope[0] == 'all':
        return True
    if scope[0] == 'afterFirst':
        return i > 0
    w = scope[1]
    return line.startswith(w) and (len(line) == len(w) or line[len(w)] in ' \t')


def fidx(n, k):
    if k == -1:
        return n - 1
    return k - 1 if k <= n else -1


def unfold(text, r):
    lines = text.split('\n')
    if r['form'] == 'cells':
        d = DELIM[r['delim']]
        header = lines[0].split(d)
        cols = []
        for name, k, value in r['pairs']:
            if name is not None:
                k = header.index(name) + 1 if header.count(name) == 1 else 0
            cols.append((k, value))
        for i, line in enumerate(lines):
            f = line.split(d)
            changed = False
            for k, value in cols:
                if k >= 1 and len(f) >= k and f[k - 1] == '':
                    f[k - 1] = value
                    changed = True
            if changed:
                lines[i] = d.join(f)
        return '\n'.join(lines)
    for i, line in enumerate(lines):
        if not in_scope(line, r['scope'], i):
            continue
        if r['delim'] == 'space':
            lead, f, s, trail = split_ws(line)
            j = fidx(len(f), r['k'])
            if j < 0 or excepted(f[j], r['except']):
                continue
            if r['form'] == 'prefix':
                f[j] = r['value'] + f[j]
            else:
                f.insert(j, r['value'])
                s.insert(j, r['pad'])
            lines[i] = join_ws(lead, f, s, trail)
        else:
            d = DELIM[r['delim']]
            f = line.split(d)
            j = fidx(len(f), r['k'])
            if j < 0 or excepted(f[j], r['except']):
                continue
            if r['form'] == 'prefix':
                f[j] = r['value'] + f[j]
            else:
                f.insert(j, r['value'])
            lines[i] = d.join(f)
    return '\n'.join(lines)


def decode(wire):
    if not wire.startswith(MARK):
        return chiron_decode(wire)
    nl = wire.find('\n')
    clause, inner = (wire, '') if nl < 0 else (wire[:nl], wire[nl + 1:])
    sentences = re.split(r'(?<=\.) (?=(?:Each line|Empty cells))', clause[len(MARK):])
    rules = [parse_sentence(s) for s in sentences]
    text = chiron_decode(inner)
    for r in rules:
        text = unfold(text, r)
    return text


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    out = [decode(w) for w in cases]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'decoded {len(out)} case(s)')
