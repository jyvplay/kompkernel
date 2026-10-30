#!/usr/bin/env python3
"""Independent stdlib-only inverse for SYNDESMOS dynamic URL references."""
import json
import re
import sys

LINK = re.compile(r'\[([^\[\]\n]+)\]\(([^\s()< >]+)\)')
HEADER = re.compile(r'^<!-- SYNDESMOS-PREFIX-TABLE v1\nP0=(https?://[A-Za-z0-9.-]+(?::\d+)?(?:/[A-Za-z0-9._~%+-]+)+/)\n-->\n')


def decode(text: str) -> str | None:
    header = HEADER.match(text)
    prefix = header.group(1) if header else None
    if header:
        text = text[header.end():]
    seen: list[str] = []
    by_url: dict[str, int] = {}
    bad = False

    def sub(m: re.Match[str]) -> str:
        nonlocal bad
        label, target = m.group(1), m.group(2)
        ref = re.fullmatch(r'⟦U(\d+)⟧', target)
        if ref:
            i = int(ref.group(1))
            if i >= len(seen):
                bad = True
                return m.group(0)
            return f'[{label}]({seen[i]})'
        if '⟦P0⟧' in target:
            if prefix is None:
                bad = True
                return m.group(0)
            target = target.replace('⟦P0⟧', prefix)
        if re.search(r'⟦[UP]', target):
            bad = True
            return m.group(0)
        if target.startswith(('http://', 'https://')):
            if target not in by_url:
                by_url[target] = len(seen)
                seen.append(target)
            return f'[{label}]({target})'
        return m.group(0)

    result = LINK.sub(sub, text)
    return None if bad else result


vectors = json.load(sys.stdin)
failures = []
for v in vectors:
    got = decode(v['transformed'])
    if got != v['expected']:
        failures.append(v['name'])
print(json.dumps({'total': len(vectors), 'passed': len(vectors) - len(failures), 'failures': failures}))
raise SystemExit(bool(failures))
