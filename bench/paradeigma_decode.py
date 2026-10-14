#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE PARADEIGMA READER (CPython, no Node).

Written from the one-chat contract alone:

    ≡ After expanding, the ≡ line lists fields removed from the JSON objects under it. Print only
    the JSON with them put back: in each object having the named field(s), insert the listed fields
    after the named field ("first" = at the top), in order, same indent, comma unless } or ]
    follows. <k> = that object's value of k, quotes dropped. Fields already present stay.

The wire's first line is "≡"; the rest is a DAEDALUS/CHIRON wire whose expansion opens with the
clause line: "≡ " + one block per object shape, blocks joined by " | ", runs by "; ", items by ", ":

    objects having "login"[ and "k2"]: after "node_id": "avatar_url": "https://…/u/<id>?v=4",
      "gravatar_id": ""; first: "url": "<repository_url>/issues/<number>"

(bench/chiron_decode.py expands the DAEDALUS part; identity when it does not start with §).
After the clause line comes the reduced JSON.  Every object (at any depth) that has all the "having" keys
is visited; for each run, each listed field that the object lacks is written right after the
anchor (the previous listed field once one has been written; "first" = before the first field),
with the anchor line's indent, <k> replaced by the object's current value of field k without its
quotes.  A listed field that is present is left alone and becomes the anchor for the next item.
The trailing comma follows JSON: present unless the next line begins with } or ].

Usage:  python3 bench/paradeigma_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode  # noqa: E402

MARK = '≡ '
WIRE_MARK = '≡\n'
FIELD = re.compile(r'^(\s*)"((?:[^"\\]|\\.)*)": (.*?)(,?)$')
OPENER = re.compile(r'^(\s*)([{\[])$')
CLOSER = re.compile(r'^(\s*)([}\]])(,?)$')
NUMBER = re.compile(r'^-?\d+(\.\d+)?([eE][+-]?\d+)?$')


# ---------------------------------------------------------------- clause
class Scanner:
    def __init__(self, s):
        self.s, self.i = s, 0

    def lit(self, t):
        if self.s.startswith(t, self.i):
            self.i += len(t)
            return True
        return False

    def str_(self):
        if self.i >= len(self.s) or self.s[self.i] != '"':
            return None
        j = self.i + 1
        while j < len(self.s) and self.s[j] != '"':
            if self.s[j] == '\\':
                j += 1
            j += 1
        if j >= len(self.s):
            return None
        v = self.s[self.i + 1:j]
        self.i = j + 1
        return v

    def scalar(self):
        if self.i < len(self.s) and self.s[self.i] == '"':
            v = self.str_()
            return None if v is None else '"' + v + '"'
        m = re.match(r'[^,;|\s]+', self.s[self.i:])
        if not m:
            return None
        self.i += len(m.group(0))
        return m.group(0)

    def done(self):
        return self.i >= len(self.s)


def parse_clause(line):
    if not line.startswith(MARK):
        return None
    sc = Scanner(line[len(MARK):])
    blocks = []
    while True:
        if not sc.lit('objects having '):
            return None
        kind = []
        while True:
            k = sc.str_()
            if k is None:
                return None
            kind.append(k)
            if not sc.lit(' and '):
                break
        if not sc.lit(': '):
            return None
        runs = []
        while True:
            if sc.lit('first: '):
                anchor = ''
            else:
                if not sc.lit('after '):
                    return None
                anchor = sc.str_()
                if anchor is None or not sc.lit(': '):
                    return None
            items = []
            while True:
                key = sc.str_()
                if key is None or not sc.lit(': '):
                    return None
                sk = sc.scalar()
                if sk is None:
                    return None
                items.append((key, sk))
                if not sc.lit(', '):
                    break
            runs.append((anchor, items))
            if not sc.lit('; '):
                break
        blocks.append((kind, runs))
        if sc.done():
            break
        if not sc.lit(' | '):
            return None
    return blocks


# ---------------------------------------------------------------- JSON lines
def slot_text(value):
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        return value[1:-1]
    if NUMBER.match(value):
        return value
    return None


def fill(sk, values):
    out, p = '', 0
    while True:
        a = sk.find('<', p)
        if a < 0:
            break
        b = sk.find('>', a)
        if b < 0:
            return None
        k = sk[a + 1:b]
        if k not in values:
            return None
        s = slot_text(values[k])
        if s is None:
            return None
        out += sk[p:a] + s
        p = b + 1
    return out + sk[p:]


def parse_tree(lines):
    """nodes: dict(kind, open, close, fields|items). Returns (root, tail_index) or None."""
    stack, root, i = [], None, 0

    def mk(ch, open_):
        return {'kind': 'obj' if ch == '{' else 'arr', 'open': open_, 'close': -1, 'fields': [], 'items': []}
    while i < len(lines):
        l = lines[i]
        top = stack[-1] if stack else None
        if top is None:
            if root is not None:
                break
            m = OPENER.match(l)
            if not m:
                return None
            root = mk(m.group(2), i)
            stack.append(root)
            i += 1
            continue
        c = CLOSER.match(l)
        if c:
            if (c.group(2) == '}') != (top['kind'] == 'obj'):
                break
            top['close'] = i
            stack.pop()
            i += 1
            continue
        if top['kind'] == 'obj':
            m = FIELD.match(l)
            if not m:
                break
            indent, key, value = m.group(1), m.group(2), m.group(3)
            field = {'line': i, 'indent': indent, 'key': key, 'value': value, 'node': None}
            if value in ('{', '['):
                node = mk(value, i)
                field['node'] = node
                stack.append(node)
            top['fields'].append(field)
        else:
            o = OPENER.match(l)
            if o:
                node = mk(o.group(2), i)
                top['items'].append(node)
                stack.append(node)
            else:
                if l.strip() == '':
                    break
                top['items'].append(i)
        i += 1
    if root is None:
        return None
    return root, i


def restore(text, blocks):
    lines = text.split('\n')
    parsed = parse_tree(lines)
    if not parsed:
        return text
    root, tail_i = parsed
    tail = lines[tail_i:]
    tail_comma = ',' if tail and not re.match(r'\s*[}\]]', tail[0]) else ''
    out = []

    def emit(node):
        out.append(lines[node['open']])
        body(node)
        if node['close'] >= 0:
            out.append(lines[node['close']])

    def body(node):
        if node['kind'] == 'arr':
            for it in node['items']:
                if isinstance(it, int):
                    out.append(lines[it])
                else:
                    emit(it)
            return
        cur = [{'key': f['key'], 'field': f, 'text': '', 'value': f['value']} for f in node['fields']]
        present = set(c['key'] for c in cur)

        def indent_of(c):
            return c['field']['indent'] if c['field'] else re.match(r'\s*', c['text']).group(0)
        for kind, runs in blocks:
            if not all(k in present for k in kind):
                continue
            for anchor, items in runs:
                if anchor == '':
                    pos = 0
                else:
                    idx = next((n for n, c in enumerate(cur) if c['key'] == anchor), -1)
                    if idx < 0:
                        continue
                    pos = idx + 1
                for key, sk in items:
                    have = next((n for n, c in enumerate(cur) if c['key'] == key), -1)
                    if have >= 0:
                        pos = have + 1
                        continue
                    values = {c['key']: c['value'] for c in cur}
                    v = fill(sk, values)
                    if v is None or not cur:
                        continue
                    indent = indent_of(cur[0] if pos == 0 else cur[pos - 1])
                    cur.insert(pos, {'key': key, 'field': None, 'text': '%s"%s": %s' % (indent, key, v), 'value': v})
                    present.add(key)
                    pos += 1
        for n, c in enumerate(cur):
            if c['field']:
                out.append(lines[c['field']['line']])
                if c['field']['node']:
                    body(c['field']['node'])
                    if c['field']['node']['close'] >= 0:
                        out.append(lines[c['field']['node']['close']])
            else:
                comma = ',' if n < len(cur) - 1 else ('' if node['close'] >= 0 else tail_comma)
                out.append(c['text'] + comma)
    emit(root)
    return '\n'.join(out + tail)


def decode(wire):
    """wire = "≡\n" + DAEDALUS/CHIRON wire; the expanded text opens with the ≡ clause line, the JSON follows."""
    if not wire.startswith(WIRE_MARK):
        return chiron_decode(wire)
    text = chiron_decode(wire[len(WIRE_MARK):])
    k = text.find('\n')
    clause, rest = (text, '') if k < 0 else (text[:k], text[k + 1:])
    blocks = parse_clause(clause)
    if blocks is None:
        return text
    return restore(rest, blocks)


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    json.dump([decode(w) for w in cases], open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
