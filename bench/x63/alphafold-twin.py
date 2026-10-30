#!/usr/bin/env python3
"""Independent stdlib-only decoder for ALPHAFOLD's in-band message."""
import json
import re
import sys

MARKERS = [
    ('⟦', '⟧', '⟪', '⟫'),
    ('§', '¶', '※', '⁂'),
    ('¤', '¥', '‡', '†'),
]
IDENT = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')


def decode(wire: str) -> str:
    if '\n' not in wire:
        raise ValueError('missing header')
    header, rest = wire.split('\n', 1)
    if not header.startswith('ALPHAFOLD/1 '):
        raise ValueError('not ALPHAFOLD/1')
    marks = next((m for m in MARKERS if f'slots={m[2]},{m[3]}; refs={m[0]},{m[1]}' in header), None)
    if marks is None:
        raise ValueError('unknown marker tuple')
    ro, rc, so, sc = marks
    body_mark = f'{ro}BODY{rc}\n'
    if body_mark not in rest:
        raise ValueError('missing BODY')
    defs, body = rest.split(body_mark, 1)
    templates = {}
    pos = 0
    while pos < len(defs):
        while pos < len(defs) and defs[pos] == '\n':
            pos += 1
        if pos == len(defs):
            break
        m = re.match(re.escape(ro) + r'T(\d+)' + re.escape(rc) + r'\n', defs[pos:])
        if not m:
            raise ValueError('bad template heading')
        ident = int(m.group(1))
        start = pos + m.end()
        terminator = f'\n{ro}/T{ident}{rc}'
        end = defs.find(terminator, start)
        if end < 0 or ident in templates:
            raise ValueError('bad template ending or duplicate id')
        templates[ident] = defs[start:end]
        pos = end + len(terminator)

    out = []
    pos = 0
    while pos < len(body):
        start = body.find(ro, pos)
        if start < 0:
            out.append(body[pos:])
            break
        out.append(body[pos:start])
        end = body.find(rc, start + len(ro))
        if end < 0:
            raise ValueError('unterminated reference')
        inside = body[start + len(ro):end]
        if '|' not in inside:
            raise ValueError('invalid reference')
        n_text, values_text = inside.split('|', 1)
        if not n_text.isdigit():
            raise ValueError('invalid template id')
        n = int(n_text)
        if n not in templates:
            raise ValueError('unknown template')
        values = values_text.split(',') if values_text else []
        if any(not IDENT.fullmatch(v) for v in values):
            raise ValueError('invalid identifier map')
        expanded = templates[n]
        for i, value in enumerate(values):
            expanded = expanded.replace(f'{so}{i}{sc}', value)
        if re.search(re.escape(so) + r'\d+' + re.escape(sc), expanded):
            raise ValueError('unfilled template slot')
        out.append(expanded)
        pos = end + len(rc)
    return ''.join(out)


def main() -> None:
    items = json.load(sys.stdin)
    failures = []
    for item in items:
        try:
            got = decode(item['wire'])
            if got != item['expected']:
                failures.append(item['name'] + ': byte mismatch')
        except Exception as exc:  # receipt records exception class/message
            failures.append(item['name'] + ': ' + type(exc).__name__ + ': ' + str(exc))
    print(json.dumps({'total': len(items), 'passed': len(items) - len(failures), 'failures': failures}))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
