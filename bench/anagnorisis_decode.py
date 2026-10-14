#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE ANAGNORISIS READER (CPython, no Node).

Written from the in-band contract line alone, e.g.

    【L】 = the standard text of license L as in GitHub's LICENSE template, after the
    copyright line; 【L header】 = L's standard per-file license notice; ": X" = X fills
    its blank(s); prefix "p" = each following line of it begins with p (blank lines: p
    without trailing spaces); layout = a named alternative line-breaking of the same
    words; wrap N = its paragraphs re-flowed greedily to N columns, prefix included;
    unwrapped = each paragraph on one line; url S = its URL with scheme S;
    indent N = its indented line(s) indented by N spaces; CRLF = \\r\\n line ends.

plus the public catalogue (bench/z45/canon/catalog.json, generated from
github/choosealicense.com by bench/z45/build-canon.py).  The inner message is a
DAEDALUS/CHIRON wire, decoded by the existing independent reader
bench/chiron_decode.py (identity when the wire does not start with §).

Usage:  python3 bench/anagnorisis_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
CATALOG = json.load(open(os.path.join(HERE, 'z45', 'canon', 'catalog.json'), encoding='utf-8'))
SLOT = '\u0001'
BY_KEY = {(e['id'], e['kind'], e.get('layout')): e for e in CATALOG}

REF = re.compile(r'【([A-Za-z0-9.+-]+)( header)?((?:; (?:layout [a-z]+|prefix "(?:[^"\\]|\\.)*"|wrap \d+|unwrapped|url https?|indent \d+|CRLF))*)(?:: ([\s\S]*?))?】')


def resolve_slots(e, given):
    n = e['slots']
    if n == 0:
        return [] if not given else None
    if len(given) == n:
        return given
    if len(given) == 1:
        return [given[0]] * n
    if not given and e.get('defaults'):
        return e['defaults']
    return None


def fill(body, slots):
    parts = body.split(SLOT)
    out = parts[0]
    for i, p in enumerate(parts[1:]):
        out += slots[i] + p
    return out


def reflow(filled, prefix, width):
    paras = re.split(r'\n[ \t]*\n', filled)
    out = []
    first = True
    for p in paras:
        words = p.split()
        line, cols = '', 0
        for w in words:
            if not line:
                line = ('' if first else prefix) + w
                cols = len(prefix) + len(w)
                first = False
            elif cols + 1 + len(w) <= width:
                line += ' ' + w
                cols += 1 + len(w)
            else:
                out.append(line)
                line = prefix + w
                cols = len(prefix) + len(w)
        out.append(line)
        out.append(prefix.rstrip())
    out.pop()
    return '\n'.join(out)


def render(m):
    ident, header, mods, slot_text = m.group(1), m.group(2), m.group(3), m.group(4)
    kind = 'header' if header else 'text'
    layout = None
    prefix = ''
    wrap = None
    url = None
    indent = None
    crlf = False
    for mod in [x for x in mods.split('; ') if x]:
        if mod.startswith('layout '):
            layout = mod[7:]
        elif mod.startswith('prefix '):
            prefix = json.loads(mod[7:])
        elif mod.startswith('wrap '):
            wrap = int(mod[5:])
        elif mod == 'unwrapped':
            wrap = float('inf')
        elif mod.startswith('url '):
            url = mod[4:]
        elif mod.startswith('indent '):
            indent = int(mod[7:])
        elif mod == 'CRLF':
            crlf = True
        else:
            return None
    e = BY_KEY.get((ident, kind, layout))
    if e is None:
        return None
    slots = resolve_slots(e, slot_text.split(' | ') if slot_text is not None else [])
    if slots is None:
        return None
    body = fill(e['body'], slots)
    if url == 'https':
        body = body.replace('http://', 'https://')
    elif url == 'http':
        body = body.replace('https://', 'http://')
    if indent is not None:
        body = re.sub(r'^ +(?=\S)', ' ' * indent, body, flags=re.M)
    if wrap is not None:
        s = reflow(body, prefix, wrap)
    else:
        lines = body.split('\n')
        s = '\n'.join(l if i == 0 else (prefix.rstrip() if l == '' else prefix + l) for i, l in enumerate(lines))
    return s.replace('\n', '\r\n') if crlf else s


def expand(text):
    def sub(m):
        r = render(m)
        return m.group(0) if r is None else r
    return REF.sub(sub, text)


def is_clause(line):
    return line.startswith('【L') and '】 = ' in line


def decode(wire):
    k = wire.find('\n')
    first = wire if k < 0 else wire[:k]
    if not is_clause(first):
        inner = wire
        return chiron_decode(inner) if inner.startswith('\u00a7') else inner
    inner = '' if k < 0 else wire[k + 1:]
    body = chiron_decode(inner) if inner.startswith('\u00a7') else inner
    if body is None:
        return None
    return expand(body)


def main():
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    out = [decode(w) for w in cases]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'decoded {len(out)} wires ({sum(o is None for o in out)} malformed)')


if __name__ == '__main__':
    main()
