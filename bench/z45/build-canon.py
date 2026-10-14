#!/usr/bin/env python3
"""Z45: generate src/lib/omega/canon-catalog.ts from the fetched public sources.
Sources (fetched live via the GitHub API, see bench/z45/canon/*/COMMIT.txt):
  - github/choosealicense.com  _licenses/*.txt  (the templates GitHub inserts into new repos)
  - per-file notices: the "how to apply" appendices inside those same texts, plus the ASF
    source header as it appears in apache/kafka (bench/z45/corpus/headers/apache_kafka_Utils.java)
"""
import re, json, os, glob
ROOT = os.path.dirname(os.path.abspath(__file__))
CA = os.path.join(ROOT, 'canon', 'choosealicense')
commit = open(os.path.join(CA, 'COMMIT.txt')).read().strip()

def body(fn):
    s = open(os.path.join(CA, fn), encoding='utf-8').read()
    fm, b = s.split('\n---\n', 1)
    b = b.lstrip('\n')
    title = re.search(r'^title:\s*(.+)$', fm, re.M).group(1).strip()
    spdx = re.search(r'^spdx-id:\s*(.+)$', fm, re.M).group(1).strip()
    return title, spdx, b.rstrip('\n')

SLOT = '\u0001'
PH = re.compile(r'\[[a-zA-Z ]+\]')
def slotify(b):
    """Templates whose copyright line is in the preamble (first 3 lines): the preamble up to the
    first blank line is dropped (title + copyright stay literal in messages; real files vary there).
    Remaining lines containing [placeholders]: the span from the first to the last placeholder on
    that line becomes one slot.  Templates whose only placeholders sit in an appendix keep them
    literally (real LICENSE files keep "[yyyy] [name of copyright owner]" verbatim)."""
    lines = b.split('\n')
    idx = [i for i, l in enumerate(lines) if PH.search(l)]
    if not idx: return b, 0, None
    if idx[0] > 2:
        # placeholders only in an appendix (Apache-2.0, ECL-2.0): slots whose default is the placeholder text itself,
        # since real LICENSE files mostly keep "[yyyy] [name of copyright owner]" verbatim
        out, defaults = [], []
        for line in lines:
            ph = list(PH.finditer(line))
            if ph:
                defaults.append(line[ph[0].start():ph[-1].end()])
                line = line[:ph[0].start()] + SLOT + line[ph[-1].end():]
            out.append(line)
        return '\n'.join(out), len(defaults), defaults
    cut = idx[0]
    while cut < len(lines) and lines[cut].strip() != '': cut += 1
    lines = lines[cut:]
    while lines and lines[0].strip() == '': lines.pop(0)
    out = []
    n = 0
    for line in lines:
        ph = list(PH.finditer(line))
        if ph:
            line = line[:ph[0].start()] + SLOT + line[ph[-1].end():]
            n += 1
        out.append(line)
    return '\n'.join(out), n, None

entries = []
for fn in sorted(glob.glob(os.path.join(CA, '*.txt'))):
    base = os.path.basename(fn)
    if base in ('COMMIT.txt', 'LIST.txt'): continue
    title, spdx, b = body(base)
    tb, n, defaults = slotify(b)
    e = dict(id=spdx, name=title, kind='text', src='github/choosealicense.com@' + commit[:12], slots=n, body=tb)
    if defaults: e['defaults'] = defaults
    entries.append(e)

def block(fn, start, end, indent):
    _, _, b = body(fn)
    i = b.find(start); j = b.find(end, i) + len(end)
    assert i >= 0 and j > i, fn
    lines = b[i - indent:j].split('\n')
    out = []
    for k, l in enumerate(lines):
        if k == 0: out.append(l[indent:] if l.startswith(' ' * indent) else l.lstrip(' '))
        elif l.strip() == '': out.append('')
        else:
            assert l.startswith(' ' * indent), (fn, l)
            out.append(l[indent:])
    return '\n'.join(out)

headers = [
    ('Apache-2.0', 'Apache License 2.0', 'apache-2.0.txt', 'Licensed under the Apache License', 'limitations under the License.', 3),
    ('GPL-3.0', 'GNU General Public License v3.0', 'gpl-3.0.txt', 'This program is free software: you can redistribute', '<https://www.gnu.org/licenses/>.', 4),
    ('GPL-2.0', 'GNU General Public License v2.0', 'gpl-2.0.txt', 'This program is free software; you can redistribute', '02110-1301 USA.', 4),
    ('AGPL-3.0', 'GNU Affero General Public License v3.0', 'agpl-3.0.txt', 'This program is free software: you can redistribute', '<https://www.gnu.org/licenses/>.', 4),
    ('LGPL-2.1', 'GNU Lesser General Public License v2.1', 'lgpl-2.1.txt', 'This library is free software; you can redistribute', '02110-1301\n    USA', 4),
    ('MPL-2.0', 'Mozilla Public License 2.0', 'mpl-2.0.txt', 'This Source Code Form is subject', 'MPL/2.0/.', 2),
]
for spdx, name, fn, start, end, indent in headers:
    hb = block(fn, start, end, indent)
    entries.append(dict(id=spdx, name=name, kind='header', src='github/choosealicense.com@' + commit[:12] + ' (appendix)', slots=0, body=hb))

# ASF source header (Apache Software Foundation policy text), as rendered in apache/kafka
kafka = open(os.path.join(ROOT, 'corpus', 'headers', 'apache_kafka_Utils.java'), encoding='utf-8').read()
m = re.search(r'/\*\n((?: \*.*\n)+?) \*/', kafka)
asf = '\n'.join((l[3:] if l.startswith(' * ') else '') for l in m.group(1).rstrip('\n').split('\n'))
assert asf.startswith('Licensed to the Apache Software Foundation')
entries.append(dict(id='ASF', name='Apache Software Foundation source header', kind='header', src='apache/kafka clients/src/main/java/org/apache/kafka/common/utils/Utils.java', slots=0, body=asf))

# BSD-3-Clause clause 3 names the copyright holder; real files put the organisation there.
for e in entries:
    if e['id'] == 'BSD-3-Clause' and e['kind'] == 'text':
        assert 'Neither the name of the copyright holder nor' in e['body']
        e['body'] = e['body'].replace('Neither the name of the copyright holder nor', 'Neither the name of ' + SLOT + ' nor', 1)
        e['slots'] += 1
        e['defaults'] = ['the copyright holder']

# GNU per-file notices say "This program"/"This library"; projects substitute their own name (FFmpeg, GLib, ...).
for e in entries:
    if e['kind'] == 'header' and e['id'] in ('GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'LGPL-2.1'):
        found = re.findall(r'[Tt]his (?:program|library)', e['body'])
        e['body'] = re.sub(r'[Tt]his (?:program|library)', SLOT, e['body'])
        e['slots'] = len(found)
        e['defaults'] = found

# Alternative renderings: same licence words, different (hand-made) line breaks, each byte-identical
# across several independent public repositories.  Sourced from the fetched corpus (bench/z45/corpus/licenses).
def corpus_body(repo_file, start):
    s = open(os.path.join(ROOT, 'corpus', 'licenses', repo_file), encoding='utf-8').read()
    k = s.find(start); assert k >= 0, repo_file
    return s[k:].rstrip('\n')
RENDERINGS = [
    ('MIT', 'classic', 'vuejs_core.txt', 'Permission is hereby granted',
     'vuejs/core eslint/eslint angular/angular fastapi/fastapi mrdoob/three.js twbs/bootstrap (byte-identical bodies)'),
    ('MIT', 'npm', 'expressjs_express.txt', 'Permission is hereby granted',
     'expressjs/express nestjs/nest webpack/webpack tj/commander.js (byte-identical bodies; single-quoted variant)'),
    ('MIT', 'jquery', 'jquery_jquery.txt', 'Permission is hereby granted',
     'jquery/jquery babel/babel (byte-identical bodies)'),
]
for spdx, layout, rf, start, src in RENDERINGS:
    b = corpus_body(rf, start)
    base = next(e for e in entries if e['id'] == spdx and e['kind'] == 'text')
    entries.append(dict(id=spdx, name=base['name'], kind='text', layout=layout, src=src, slots=0, body=b))

# sanity: ids unique per kind
seen = set()
for e in entries:
    k = (e['id'], e['kind'], e.get('layout')); assert k not in seen, k; seen.add(k)

ts = ['/**',
      ' * src/lib/omega/canon-catalog.ts — GENERATED by bench/z45/build-canon.py. Do not edit by hand.',
      ' *',
      ' * Public canonical texts for the ANAGNORISIS lane. Provenance:',
      f' *   github/choosealicense.com _licenses/*.txt @ {commit}',
      ' *   apache/kafka Utils.java (ASF source header rendering)',
      ' * Slots (the copyright line placeholders of a template) are the character U+0001.',
      ' */',
      '',
      "export interface CanonEntry { id: string; name: string; kind: 'text' | 'header'; layout?: string; src: string; slots: number; defaults?: string[]; body: string }",
      '',
      'export const CANON_SLOT = "\\u0001";',
      '',
      'export const CANON: readonly CanonEntry[] = ' + json.dumps(entries, ensure_ascii=False, indent=1).replace('\\u0001', '\\u0001') + ';',
      '']
open(os.path.join(ROOT, '..', '..', 'src', 'lib', 'omega', 'canon-catalog.ts'), 'w', encoding='utf-8').write('\n'.join(ts))
# JSON copy for the independent Python reader (bench/anagnorisis_decode.py)
json.dump(entries, open(os.path.join(ROOT, 'canon', 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(entries), 'entries;', sum(len(e['body']) for e in entries), 'chars')
for e in entries:
    if e['kind'] == 'header' or e['slots'] > 1 or e.get('layout'): print(' ', e['id'], e['kind'], 'slots', e['slots'], 'lines', e['body'].count('\n') + 1)
