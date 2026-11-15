#!/usr/bin/env python3
"""X117 fused-key mutation battery against the independent cold reader.
A mutation is SILENT-WRONG only if it decodes without exception to a different
source. Refusals (parse/CRC/structure) are the desired fail-closed behavior.
Writes bench/x117/receipts/coldmut.json. No encoder import.
"""
import importlib.util
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('x117_coldread', ROOT / 'bench/x117/coldread.py')
cr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cr)

p = ROOT / 'bench/x117/receipts/wires/ls-l-real.syn.txt'
s = p.read_text(encoding='utf-8')
src, pre, parts = cr.decode(s)
key, body = s.split('\n', 1)
trials = []

def attempt(label, mut):
    try:
        out, _, _ = cr.decode(mut)
        silent = out != src
        trials.append({'label': label, 'refused': False, 'silentWrong': silent, 'identity': mut == s})
    except Exception as exc:
        trials.append({'label': label, 'refused': True, 'silentWrong': False, 'identity': mut == s, 'error': type(exc).__name__})

# Key: single-character substitutions at every position.
for i in range(len(key)):
    for c in ['0', 'x', ' ', ';']:
        attempt(f'key[{i}]={c!r}', key[:i] + c + key[i+1:] + '\n' + body)
# Key deletions.
for i in range(len(key)):
    attempt(f'key-del[{i}]', key[:i] + key[i+1:] + '\n' + body)
# Body: sampled single-character substitutions/deletions.
for i in range(0, len(body), 97):
    for c in ['0', 'λ', '※', ' ']:
        attempt(f'body[{i}]={c!r}', key + '\n' + body[:i] + c + body[i+1:])
    attempt(f'body-del[{i}]', key + '\n' + body[:i] + body[i+1:])

silent = sum(1 for t in trials if t['silentWrong'])
refused = sum(1 for t in trials if t['refused'])
identity = sum(1 for t in trials if t.get('identity'))
receipt = {
    'schema': 'kompkernel-x117-coldmut-v1', 'date': '2026-11-15',
    'artifact': str(p.relative_to(ROOT)), 'trials': len(trials),
    'refused': refused, 'identity': identity, 'silentWrong': silent,
    'allFailClosed': silent == 0,
    'note': 'Independent CPython reader; a refusal is parse/CRC/structure fail-closed. Identity substitutions decode to the same source and are not mutations in effect. No external model API.',
    'rows': trials,
}
out = ROOT / 'bench/x117/receipts/coldmut.json'
out.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(f'X117 coldmut trials={len(trials)} refused={refused} identity={identity} silentWrong={silent} allFailClosed={silent == 0}')
sys.exit(0 if silent == 0 else 1)
