#!/usr/bin/env python3
"""X119 independent CPython cold read of the DIGLOSSIA CHIRON layer.

DIGLOSSIA adds no contract clause and no operator: the emitted message is an
ordinary CHIRON wire. The invariant is therefore
    chiron_decode(ON[§:]) == chiron_decode(OFF[§:])
byte for byte. On lanes whose parent is a pure CHIRON lane that expansion IS the
source; on composed lanes it is the pre-frontier rewrite, and the parent inverse
is unchanged from X118. This script shares no code with the TypeScript encoder.
"""
import importlib.util
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('chiron_decode', ROOT / 'bench/chiron_decode.py')
cd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cd)

off_rows = {}
for line in (ROOT / 'bench/x119/receipts/frontier.jsonl').read_text(encoding='utf-8').splitlines():
    if line.strip():
        r = json.loads(line)
        off_rows[r['path']] = r
# ls-l-real OFF is the X118 re-gated message, not the stale x117 row.
lsl = ROOT / 'bench/x118/receipts/regate-lsl-message.txt'
if lsl.exists():
    off_rows['bench/holdout-x41/ls-l-real.txt'] = {
        'path': 'bench/holdout-x41/ls-l-real.txt',
        'message': lsl.read_text(encoding='utf-8'),
    }

wins = ROOT / 'bench/x119/receipts/ab-messages.jsonl'
rows = []
if wins.exists():
    for line in wins.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        w = json.loads(line)
        path = w['path']
        on = w['message']
        off = off_rows[path]['message']
        def layer(m):
            i = m.find('\u00a7')
            return m[i:] if i >= 0 else m
        on_exp = cd.decode(layer(on))
        off_exp = cd.decode(layer(off))
        src = (ROOT / path).read_text(encoding='utf-8')
        rows.append({
            'path': path,
            'offTokens': w['offTokens'], 'onTokens': w['onTokens'],
            'delta': w['deltaTokens'],
            'chironLayerEqual': on_exp == off_exp,
            'offExpansionIsSource': off_exp == src,
            'onExpansionIsSource': on_exp == src,
            'contractPrefixEqual': on[:on.find('\u00a7')] == off[:off.find('\u00a7')],
        })

ok = all(r['chironLayerEqual'] and r['contractPrefixEqual'] for r in rows)
receipt = {
    'schema': 'kompkernel-x119-coldread-v1',
    'reader': 'bench/chiron_decode.py (independent CPython)',
    'lanes': len(rows), 'allChironLayerEqual': ok,
    'allContractPrefixEqual': all(r['contractPrefixEqual'] for r in rows),
    'rows': rows,
    'note': 'No model API. LLM-blind decode is not claimed; the executed independent reader is the evidence.',
}
out = ROOT / 'bench/x119/receipts/coldread.json'
out.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
for r in rows:
    print(f"{r['path'].split('/')[-1]:22} Δ={r['delta']} layerEqual={r['chironLayerEqual']} prefixEqual={r['contractPrefixEqual']} offIsSrc={r['offExpansionIsSource']}")
print(f"X119 coldread lanes={len(rows)} allChironLayerEqual={ok}")
sys.exit(0 if ok and rows else 1)
