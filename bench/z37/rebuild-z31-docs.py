# Z37: rebuild the 111 missing /home/user/z31/docs files from npm registry tarballs (registry.npmjs.org).
# A file is written only if its byte length equals the 'bytes' field recorded in bench/z34/receipts/vxr-eval-151.jsonl.
import json, os, re, tarfile, urllib.request, io, collections
REC = [json.loads(l) for l in open('bench/z34/receipts/vxr-eval-151.jsonl') if l.strip()]
miss = [r for r in REC if not os.path.exists(r['file'])]
by_pkg = collections.defaultdict(list)
for r in miss:
    d = r['file'].split('/')[5]               # e.g. ajv-8.20.0
    m = re.match(r'^(.*)-(\d+\.\d+\.\d+.*)$', d)
    by_pkg[(m.group(1), m.group(2))].append(r)
ok, bad, err = 0, [], []
for (name, ver), rows in sorted(by_pkg.items()):
    try:
        meta = json.load(urllib.request.urlopen(f'https://registry.npmjs.org/{name}/{ver}', timeout=60))
        tb = urllib.request.urlopen(meta['dist']['tarball'], timeout=120).read()
    except Exception as e:
        err.append((name, ver, str(e))); continue
    tf = tarfile.open(fileobj=io.BytesIO(tb), mode='r:gz')
    names = {m.name: m for m in tf.getmembers() if m.isfile()}
    for r in rows:
        rel = '/'.join(r['file'].split('/')[6:])   # package/<...>
        mem = names.get(rel)
        if mem is None:
            # case-insensitive fallback for README/readme naming
            cand = [n for n in names if n.lower() == rel.lower()]
            mem = names.get(cand[0]) if cand else None
        if mem is None:
            bad.append((r['file'], 'not-in-tarball')); continue
        data = tf.extractfile(mem).read()
        if len(data) != r['bytes']:
            bad.append((r['file'], f"bytes {len(data)} != {r['bytes']}")); continue
        os.makedirs(os.path.dirname(r['file']), exist_ok=True)
        open(r['file'], 'wb').write(data); ok += 1
print(json.dumps({'missing_before': len(miss), 'rebuilt_byte_exact': ok, 'mismatch_or_absent': len(bad), 'fetch_errors': len(err)}))
for b in bad[:20]: print('BAD', b)
for e in err[:20]: print('ERR', e)
