# Corrected analysis of a registry sweep (bench/z18/registry-sweep.ts output).
# The sweep's own decodedOk flag is vacuously true for entries that return no `decoded`
# (all 'lossy' entries), so only entries DECLARED fidelity 'exact' are counted here.
import json, sys
path = sys.argv[1]
rows = [json.loads(l) for l in open(path) if l.strip()]
done = any(r.get('kind') == 'done' for r in rows)
data = [r for r in rows if 'oneChat' in r]
exact = [r for r in data if r.get('fidelity') == 'exact']
print(f'file={path} entries_with_output={len(data)} errors={len([r for r in rows if "error" in r])} complete={done}')
print(f'declared exact={len(exact)} declared lossy={len(data)-len(exact)}')
print('declared exact but decode FAILED:', [(r['key'], r['oneChat']) for r in exact if not r['decodedOk']])
print('ASCII-clean, declared exact, decode OK (smallest first):')
for r in sorted([r for r in exact if r['decodedOk'] and r['nonAscii'] == 0], key=lambda r: r['oneChat'])[:8]:
    print(f"  {r['key']:<14} {r['oneChat']:>6}")
print('all declared-exact, decode OK (smallest first):')
for r in sorted([r for r in exact if r['decodedOk']], key=lambda r: r['oneChat'])[:6]:
    print(f"  {r['key']:<14} {r['oneChat']:>6} nonAscii={r['nonAscii']}")
