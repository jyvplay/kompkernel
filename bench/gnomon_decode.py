#!/usr/bin/env python3
"""
SECOND, INDEPENDENT IMPLEMENTATION OF THE GNOMON READER (CPython, no Node).

Input is the WHOLE one-chat message, as the reader sees it:

    <DAEDALUS wire body>
    <DAEDALUS/CHIRON contract line>          (one line, written by chironDecoderPrompt)
    [<GNOMON sentence for npm>]              (present only if the npm rule was used)
    [<GNOMON sentence for rest>]             (present only if the REST rule was used)

Two bases (src/lib/omega/gnomon.ts): a DAEDALUS body, or a GRAMMA body whose first line is a
JSON dialect clause (⟐j1/2/4/tab). For a GRAMMA body the reader drops the clause, expands the
DAEDALUS part, then pretty-prints it with JSON.stringify(v, null, unit) (json_pretty, a port of gramma.ts).

Procedure (the same as the sentences say):
  1. strip the trailing GNOMON sentence lines and note which rules they name;
  2. drop the one CHIRON contract line before them;
  3. expand the DAEDALUS body with bench/chiron_decode.py (and the JSON dialect, if the clause is present);
  4. restore the rule-elided fields: first REST (the "~" link forms), then npm
     (the "Resolved ~" lines). This is the order the encoder inverted.

Usage:  python3 bench/gnomon_decode.py messages.json out.json
        messages.json = list of whole messages; out.json = list of decoded texts.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chiron_decode import decode as chiron_decode, START as CHIRON_START  # noqa: E402

REST_SENTENCE = ('~ in a "_url" value = the object url + "/" + the key without "_url"; '
                 '~k+x = link k of the object (0 = url, then earlier links in order) + x.')
NPM_SENTENCE = ('Resolved ~ = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz, NAME = the package path '
                'after node_modules/, BASE = its last segment, VERSION = the entry version.')

OPEN = re.compile(r'\{\s*$')
CLOSE = re.compile(r'^\s*\}')
LINK = re.compile(r'^(\s*"([A-Za-z_]*)url": ")([^"]*)(",?)$')
REST_STEM = re.compile(r'^(\s*"([A-Za-z_]*)url": ")~"(,?)$')
REST_FRONT = re.compile(r'^(\s*"[A-Za-z_]*url": ")~(\d+)([^"]*)(",?)$')
ENTRY = re.compile(r'^\s*"([^"]*)": \{\s*$')
VERSION = re.compile(r'^\s*"version": "([^"]*)",?\s*$')
NPM_TILDE = re.compile(r'^(\s*"resolved": ")~(",?)$')


def parse_message(msg):
    lines = msg.split('\n')
    rules = []
    # trailing sentence lines, read from the end; npm is written before rest
    while lines and lines[-1] in (NPM_SENTENCE, REST_SENTENCE):
        rules.insert(0, 'npm' if lines[-1] == NPM_SENTENCE else 'rest')
        lines.pop()
    if not rules:
        return msg, []          # no GNOMON sentences: a plain DAEDALUS message
    # the CHIRON contract line is present only when the DAEDALUS wire has a CHIRON tape (starts with the start mark)
    if msg.startswith(CHIRON_START):
        if not lines:
            raise ValueError('no CHIRON contract line before the GNOMON sentences')
        lines.pop()
    return '\n'.join(lines), rules


def restore_rest(text):
    scopes = [{'base': None, 'list': []}]
    out = []
    for line in text.split('\n'):
        if OPEN.search(line):
            scopes.append({'base': None, 'list': []})
        sc = scopes[-1]
        m_stem = REST_STEM.match(line)
        m_front = REST_FRONT.match(line)
        m_plain = LINK.match(line)
        if m_stem:
            if sc['base'] is None:
                raise ValueError('stem before url')
            v = sc['base'] + '/' + re.sub(r'_$', '', m_stem.group(2))
            line = m_stem.group(1) + v + '"' + m_stem.group(3)
            sc['list'].append(v)
        elif m_front:
            k = int(m_front.group(2))
            if k >= len(sc['list']):
                raise ValueError('bad link index')
            v = sc['list'][k] + m_front.group(3)
            line = m_front.group(1) + v + m_front.group(4)
            sc['list'].append(v)
        elif m_plain and m_plain.group(3).startswith('https://'):
            if m_plain.group(2) == '':
                sc['base'] = m_plain.group(3)
            sc['list'].append(m_plain.group(3))
        if CLOSE.search(line) and len(scopes) > 1:
            scopes.pop()
        out.append(line)
    return '\n'.join(out)


def npm_name(key):
    i = key.rfind('node_modules/')
    return key[i + len('node_modules/'):] if i >= 0 else key


def restore_npm(text):
    name = None
    version = None
    out = []
    for line in text.split('\n'):
        e = ENTRY.match(line)
        if e:
            name = npm_name(e.group(1)) or None
            version = None
            out.append(line)
            continue
        v = VERSION.match(line)
        if v:
            version = v.group(1)
            out.append(line)
            continue
        t = NPM_TILDE.match(line)
        if t:
            if name is None or version is None:
                raise ValueError('resolved before entry/version')
            base = name.split('/')[-1]
            url = 'https://registry.npmjs.org/%s/-/%s-%s.tgz' % (name, base, version)
            out.append(t.group(1) + url + t.group(2))
            continue
        out.append(line)
    return '\n'.join(out)


GRAMMA_TAG = '\u27d0'
# the JSON dialect clauses of src/lib/omega/gramma.ts (jsonClause), each with its indent unit
JSON_CLAUSES = {
    GRAMMA_TAG + 'j1: print it as JSON.stringify(v,null,1).': ' ',
    GRAMMA_TAG + 'j2: print it as JSON.stringify(v,null,2).': '  ',
    GRAMMA_TAG + 'j4: print it as JSON.stringify(v,null,4).': '    ',
    GRAMMA_TAG + 'j"\\t": print it as JSON.stringify(v,null,"\\t").': '\t',
}


def json_pretty(cheap, unit):
    """Port of jsonPretty in gramma.ts: JSON.stringify(v, null, unit) on minified JSON."""
    out = []
    depth = 0
    in_str = False
    esc = False
    i = 0
    n = len(cheap)
    while i < n:
        ch = cheap[i]
        if in_str:
            out.append(ch)
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == '"':
                in_str = False
            i += 1
            continue
        if ch == '"':
            in_str = True
            out.append(ch)
        elif ch in '{[':
            closer = '}' if ch == '{' else ']'
            j = i + 1
            while j < n and cheap[j] in ' \n\r\t':
                j += 1
            if j < n and cheap[j] == closer:
                out.append(ch + closer)   # empty containers stay inline
                i = j + 1
                continue
            depth += 1
            out.append(ch + '\n' + unit * max(0, depth))
        elif ch in '}]':
            depth = max(0, depth - 1)
            out.append('\n' + unit * max(0, depth) + ch)
        elif ch == ',':
            out.append(',\n' + unit * max(0, depth))
        elif ch == ':':
            out.append(': ')
        else:
            out.append(ch)
        i += 1
    return ''.join(out)


def gramma_decode(prompt):
    """Port of grammaDecode in gramma.ts: drop the dialect clause, read the DAEDALUS body, then the dialect expansion."""
    first = prompt.split('\n', 1)[0]
    unit = JSON_CLAUSES.get(first)
    rest = prompt[prompt.index('\n') + 1:] if unit is not None else prompt
    if rest.startswith(CHIRON_START):
        body = chiron_decode(rest[:rest.rindex('\n')])   # the DAEDALUS contract is the last line
    else:
        body = rest
    return json_pretty(body, unit) if unit is not None else body


def decode_message(msg):
    lines = msg.split('\n')
    rules = []
    # strip the trailing GNOMON sentence lines, read from the end; npm is written before rest
    while lines and lines[-1] in (NPM_SENTENCE, REST_SENTENCE):
        rules.insert(0, 'npm' if lines[-1] == NPM_SENTENCE else 'rest')
        lines.pop()
    prompt = '\n'.join(lines)
    if prompt.split('\n', 1)[0] in JSON_CLAUSES:
        text = gramma_decode(prompt)                     # GRAMMA base
    elif prompt.startswith(CHIRON_START):
        if '\n' not in prompt:
            raise ValueError('no CHIRON contract line')
        text = chiron_decode(prompt[:prompt.rindex('\n')])   # DAEDALUS base, contract line dropped
    else:
        text = prompt                                    # raw identity, no contract line
    if 'rest' in rules:
        text = restore_rest(text)
    if 'npm' in rules:
        text = restore_npm(text)
    return text


def main():
    cases = json.load(open(sys.argv[1], encoding='utf8'))
    out = [decode_message(m) for m in cases]
    json.dump(out, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False)


if __name__ == '__main__':
    main()
