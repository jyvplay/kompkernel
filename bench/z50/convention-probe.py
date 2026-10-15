#!/usr/bin/env python3
"""z50 probe: does every "resolved" URL in a real npm lockfile equal the registry convention built from
its entry key and version? Reads only the lockfile (JSON). Writes a one-line-per-file receipt on stdout."""
import json, sys
for path in sys.argv[1:]:
    try:
        d = json.load(open(path, encoding='utf-8'))
    except json.JSONDecodeError as e:
        print(json.dumps({'file': path, 'valid_json': False, 'error': str(e)[:80]}))
        continue
    pk = d.get('packages', {})
    ok = bad = integ_no_res = 0; examples = []
    for key, v in pk.items():
        if not key.startswith('node_modules/'):
            continue
        name = key[key.rfind('node_modules/') + len('node_modules/'):]
        base = name.rsplit('/', 1)[-1]
        if 'resolved' in v:
            exp = f"https://registry.npmjs.org/{name}/-/{base}-{v.get('version')}.tgz"
            if v['resolved'] == exp: ok += 1
            else:
                bad += 1
                if len(examples) < 3: examples.append((key, v['resolved']))
        elif 'integrity' in v:
            integ_no_res += 1
    print(json.dumps({'file': path, 'lockfileVersion': d.get('lockfileVersion'), 'entries': len(pk),
                      'resolved_matching_convention': ok, 'resolved_not_matching': bad,
                      'integrity_without_resolved': integ_no_res, 'examples_not_matching': examples}))
