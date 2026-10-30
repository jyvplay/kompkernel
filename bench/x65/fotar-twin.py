#!/usr/bin/env python3
"""Independent stdlib-only FOTAR table decoder for the TS red-team receipt."""
import json
from pathlib import Path

receipt = json.loads(Path('bench/x65/receipts/fotar-redteam.json').read_text(encoding='utf-8'))
case = receipt['independentCase']
assert case is not None
entries = case['entries']
pairs = json.loads(case['tableJson'])
by_marker = {marker: surface for marker, surface in pairs}
assert len(by_marker) == len(pairs), 'duplicate marker'
assert all(by_marker[e['marker']] == e['surface'] for e in entries), 'table/receipt mismatch'
markers = sorted(by_marker, key=len, reverse=True)
wire = case['mapped']
out = []
i = 0
while i < len(wire):
    marker = next((m for m in markers if wire.startswith(m, i)), None)
    if marker is None:
        out.append(wire[i])
        i += 1
    else:
        out.append(by_marker[marker])
        i += len(marker)
restored = ''.join(out)
assert restored == case['source'], 'independent restore mismatch'
assert case['exactTypeScript'] is True
result = {'independentPython': True, 'exact': True, 'entries': len(entries),
          'sourceCodepoints': len(case['source']), 'restoredCodepoints': len(restored)}
Path('bench/x65/receipts/fotar-twin.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
