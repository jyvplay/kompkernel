#!/usr/bin/env python3
"""X120 mutation battery on the VELTISTOS+DIGLOSSIA-emitted CHIRON layer.

DIGLOSSIA adds no checksum: the decoder is the ordinary CHIRON reader, so a
mutation can change the expansion. This battery records the honest outcome
classes (identity-effect / changed / malformed-refused) rather than claiming
fail-closed authentication. The correctness claim is the ENCODER gate
(chironDecode(candidate)==chironDecode(incumbent) before admission), attacked
separately by attack-overlap.ts.
"""
import importlib.util
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('chiron_decode', ROOT / 'bench/chiron_decode.py')
cd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cd)

wins = ROOT / 'bench/x120/receipts/ab-messages.jsonl'
trials = []
if wins.exists():
    for line in wins.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        w = json.loads(line)
        m = w['message']
        i = m.find('\u00a7')
        if i < 0:
            continue
        layer = m[i:]
        ref = cd.decode(layer)
        # sample tape and body positions
        cut = layer.find('\u00b6')
        positions = list(range(1, len(layer), max(1, len(layer) // 120)))
        for pos in positions:
            for c in ['0', 'x', ' ', '\u00a7']:
                mut = layer[:pos] + c + layer[pos + 1:]
                try:
                    out = cd.decode(mut)
                    if out == mut:
                        cls = 'malformed-refused'
                    elif out == ref:
                        cls = 'identity-effect'
                    else:
                        cls = 'changed'
                except Exception:
                    cls = 'malformed-refused'
                trials.append({'path': w['path'], 'pos': pos, 'sub': c, 'class': cls})
            mut = layer[:pos] + layer[pos + 1:]
            try:
                out = cd.decode(mut)
                cls = 'malformed-refused' if out == mut else ('identity-effect' if out == ref else 'changed')
            except Exception:
                cls = 'malformed-refused'
            trials.append({'path': w['path'], 'pos': pos, 'del': True, 'class': cls})

counts = {k: sum(1 for t in trials if t['class'] == k) for k in ['identity-effect', 'changed', 'malformed-refused']}
receipt = {
    'schema': 'kompkernel-x120-coldmut-v1', 'trials': len(trials), 'counts': counts,
    'note': 'Ordinary CHIRON layer has no checksum; changed expansions under mutation are expected and are NOT a silent-accept of the original. Encoder admission is the exactness gate; see attack-overlap.json.',
    'rows': trials,
}
out = ROOT / 'bench/x120/receipts/coldmut.json'
out.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(f"X119 coldmut trials={len(trials)} counts={counts}")
