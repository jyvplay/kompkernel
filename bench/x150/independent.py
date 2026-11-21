"""Independent byte-level inverse of the raw CHRISMATA fixture envelopes.
No project codec imports. Verify source bytes rather than an encoder boolean.
Does not verify the parent-compressed envelope or model readability.
"""
import hashlib
import json
from pathlib import Path

rows = json.loads(Path('bench/x150/receipts/unit.json').read_text())['rows']
results = []
for i, row in enumerate(rows):
    key = Path(f'bench/x150/receipts/key-{i}.txt').read_bytes()
    folded = Path(f'bench/x150/receipts/folded-{i}.txt').read_bytes()
    source = Path(row['path']).read_bytes()
    # Reject a key other than the exact English instruction understood here.
    intro = b'After decoding, for each line starting with '
    ending = (b', insert ESC[code m before its first character, ESC[m after it, '
              b'ESC[code m after that, and ESC[m at line end. If the line is only '
              b'that character, insert only ESC[code m before it and ESC[m after it. '
              b'ESC is U+001B; omit the space in code m. Preserve other characters and line endings.\n')
    if not key.startswith(intro) or not key.endswith(ending):
        raise ValueError('unknown key')
    selector = key[len(intro):-len(ending)]
    if selector not in (b'+ means 32', b'- means 31', b'+ means 32 or - means 31'):
        raise ValueError('unknown selector')
    codes = {}
    if b'+ means 32' in selector: codes[43] = b'32'
    if b'- means 31' in selector: codes[45] = b'31'
    output = []
    for line in folded.split(b'\n'):
        code = codes.get(line[0]) if line else None
        if code is None:
            output.append(line)
        else:
            head = b'\x1b[' + code + b'm' + line[:1] + b'\x1b[m'
            output.append(head if len(line) == 1 else head + b'\x1b[' + code + b'm' + line[1:] + b'\x1b[m')
    decoded = b'\n'.join(output)
    if decoded != source:
        raise AssertionError(row['path'])
    results.append({'path': row['path'], 'bytes': len(source), 'sha256': hashlib.sha256(source).hexdigest(), 'byte_exact': True})
print(json.dumps(results, indent=2))
