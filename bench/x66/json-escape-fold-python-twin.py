#!/usr/bin/env python3
"""Independent reader for the X66 transform layer; reads only the serialized header and parent text."""
import hashlib
import json
import re
from pathlib import Path

VECTOR = Path('bench/x66/receipts/python-twin-vector.json')
PAIR_MAP = {'<': r'\u003c', '>': r'\u003e', '=': r'\u003d', '&': r'\u0026', "'": r'\u0027'}
CONTRACT_SUFFIX = (
    "after decoding the following complete parent message, scan its text left to right. "
    "Each occurrence of the stated marker must be followed by exactly one of < > = & '. "
    r"Replace the marker and that next character with, respectively, \u003c, \u003e, \u003d, \u0026, or \u0027. "
    "Copy every other character unchanged. The encoder chooses a marker absent from the original text. "
    "These five lowercase escapes are folded only inside JSON strings; all other source characters and bytes are unchanged."
)

v = json.loads(VECTOR.read_text(encoding='utf-8'))
match = re.fullmatch(r'JSON-ESCAPE-FOLD-1 marker=([0-9A-F]+) \((.)\): (.*)', v['header'])
assert match, 'malformed serialized transform header'
cp = int(match.group(1), 16)
marker = chr(cp)
assert match.group(2) == marker and cp == v['markerCodePoint']
assert match.group(3) == CONTRACT_SUFFIX, 'decoder instructions differ from the checked contract'

wire = v['transformed']
out = []
i = 0
while i < len(wire):
    if wire.startswith(marker, i):
        at = i + len(marker)
        assert at < len(wire), 'dangling marker'
        literal = wire[at]
        assert literal in PAIR_MAP, f'invalid marker target: {literal!r}'
        out.append(PAIR_MAP[literal])
        i = at + 1
    else:
        out.append(wire[i])
        i += 1
restored = ''.join(out).encode('utf-8')
source_bytes = Path(v['sourcePath']).read_bytes()
assert hashlib.sha256(source_bytes).hexdigest() == v['sourceSha256']
assert restored == source_bytes, 'Python transform inverse did not restore exact fixture bytes'
print(json.dumps({'passed': True, 'sourcePath': v['sourcePath'], 'sourceBytes': len(source_bytes),
                  'replacements': v['replacements'], 'markerCodePoint': cp,
                  'byteExact': True, 'decoder': 'Python stdlib only; serialized header + decoded parent text'}))
