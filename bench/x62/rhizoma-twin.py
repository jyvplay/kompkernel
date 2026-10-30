#!/usr/bin/env python3
"""Independent stdlib-only decoder for RHIZOMA tree indentation."""
import json
import sys

BRANCHES = ('├──', '└──')

def expand(text: str) -> str | None:
    out = []
    entries = markers = 0
    for physical in text.splitlines(keepends=True):
        line = physical[:-1] if physical.endswith('\n') else physical
        ending = '\n' if physical.endswith('\n') else ''
        marks = [line.find(b) for b in BRANCHES if line.find(b) >= 0]
        if marks:
            entries += 1
            end = min(marks)
            rebuilt = []
            for char in line[:end]:
                if char == '│':
                    return None
                if char == '^':
                    markers += 1
                    rebuilt.extend(['│', '\u00a0', '\u00a0'])
                else:
                    rebuilt.append(char)
            rebuilt.append(line[end:])
            out.append(''.join(rebuilt) + ending)
        else:
            out.append(physical)
    return ''.join(out) if entries >= 2 and markers >= 2 else None

vectors = json.load(sys.stdin)
failures = []
for v in vectors:
    if expand(v['transformed']) != v['expected']:
        failures.append(v['name'])
print(json.dumps({'total': len(vectors), 'passed': len(vectors) - len(failures), 'failures': failures}))
raise SystemExit(bool(failures))
