#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE SYNARTESIS READER (CPython, no Node).

Written from the one-chat contract alone (the first line of the message) and the
PARADEIGMA/DAEDALUS reader it delegates to (bench/paradeigma_decode.py):

    ∴ npm lock: each node_modules/ entry with "integrity" but no "resolved" gets, after its
    "version" line, "resolved": "https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz", (NAME = key
    after last node_modules/; BASE = NAME after last /; VERSION = its version).

Wire forms (first line decides):
    ESCAPE line ("∴ npm lock: literal payload follows") -> the rest is a PARADEIGMA/DAEDALUS wire
    RULE_LINE                              -> the rest is a PARADEIGMA/DAEDALUS wire of the REDUCED
                                              JSON; expand it, then put the omitted lines back
    anything else                          -> a PARADEIGMA/DAEDALUS wire, output as is

Restore: an entry is a line `<ind>"node_modules/…": {` with a closing line `<ind>}` or `<ind>},`.
Its DIRECT fields are the lines that start with `<ind>  "`. An entry with a direct "integrity"
field and no direct "resolved" field gets the resolved line inserted right after its direct
"version" line, as `<ind>  "resolved": "<URL>",`.

Usage:  python3 bench/synartesis_decode.py cases.json out.json
        cases.json = list of wire strings; out.json = list of decoded strings.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paradeigma_decode import decode as paradeigma_decode  # noqa: E402

PREFIX = '∴ npm lock:'
ESCAPE = '∴ npm lock: literal payload follows'
RULE = ('∴ npm lock: each node_modules/ entry with "integrity" but no "resolved" gets, after its "version" line, '
        '"resolved": "https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz", (NAME = key after last node_modules/; '
        'BASE = NAME after last /; VERSION = its version).')

ENTRY_OPEN = re.compile(r'^( *)"(node_modules/[^"\\]*)": \{$')
FIELD = re.compile(r'^( *)"([^"\\]+)": ')
VERSION_LINE = re.compile(r'^ *"version": "([^"\\]*)",?$')


def entries_of(lines):
    out = []
    for i, line in enumerate(lines):
        m = ENTRY_OPEN.match(line)
        if not m:
            continue
        ind, key = m.group(1), m.group(2)
        close = -1
        for j in range(i + 1, len(lines)):
            if lines[j] == ind + '}' or lines[j] == ind + '},':
                close = j
                break
        if close < 0:
            continue
        fields = {}
        child = ind + '  '
        for k in range(i + 1, close):
            ln = lines[k]
            if not ln.startswith(child + '"'):
                continue
            f = FIELD.match(ln)
            if not f or f.group(1) != child:
                continue
            fields.setdefault(f.group(2), []).append(k)
        out.append({'ind': ind, 'key': key, 'fields': fields})
    return out


def restore(reduced):
    lines = reduced.split('\n')
    inserts = {}
    for e in entries_of(lines):
        if not e['key'].startswith('node_modules/'):
            continue
        if 'integrity' not in e['fields'] or 'resolved' in e['fields']:
            continue
        vs = e['fields'].get('version')
        if not vs:
            raise ValueError('entry without a version line: ' + e['key'])
        vm = VERSION_LINE.match(lines[vs[0]])
        if not vm:
            raise ValueError('version is not a plain string: ' + e['key'])
        name = e['key'][e['key'].rfind('node_modules/') + len('node_modules/'):]
        base = name[name.rfind('/') + 1:]
        if not name or not base:
            raise ValueError('empty name: ' + e['key'])
        inserts[vs[0]] = '%s  "resolved": "https://registry.npmjs.org/%s/-/%s-%s.tgz",' % (
            e['ind'], name, base, vm.group(1))
    if not inserts:
        return reduced
    out = []
    for i, ln in enumerate(lines):
        out.append(ln)
        if i in inserts:
            out.append(inserts[i])
    return '\n'.join(out)


def decode(wire):
    k = wire.find('\n')
    first = wire if k < 0 else wire[:k]
    rest = '' if k < 0 else wire[k + 1:]
    if first == ESCAPE:
        return paradeigma_decode(rest)
    if first == RULE:
        return restore(paradeigma_decode(rest))
    return paradeigma_decode(wire)  # any other payload, including one that merely starts with PREFIX


if __name__ == '__main__':
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    json.dump([decode(w) for w in cases], open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
