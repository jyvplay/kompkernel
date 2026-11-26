"""Resume only missing complete canonical lanes; three workers, not speed evidence."""
import json,subprocess,concurrent.futures
from pathlib import Path
root=Path('bench/x186');r=root/'receipts';p=r/'frontier.jsonl'
done=[json.loads(s) for s in p.read_text().splitlines()];lanes=(root/'lanes.txt').read_text().splitlines();have={x['path'] for x in done}
pending=[x for x in lanes if x not in have];pending.sort(key=lambda x:0 if 'apt-real' in x else 1)
(r/'frontier-resume.json').write_text(json.dumps(dict(retained=list(have),pending=pending,workers=3,reason='Fresh canonical replay; concurrent lanes are not speed evidence'),indent=2))
def run(item):
 i,lane=item;manifest=root/f'resume-{i:02}.txt';manifest.write_text(lane+'\n');out=r/f'frontier-part-{i:02}.jsonl'
 with (r/f'frontier-part-{i:02}.log').open('w') as log:subprocess.run(['node','--max-old-space-size=1400',str(root/'frontier.mjs'),str(manifest),str(out)],stdout=log,stderr=subprocess.STDOUT,check=True)
 rows=[json.loads(s) for s in out.read_text().splitlines()];assert len(rows)==1 and rows[0]['path']==lane;return rows[0]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for f in concurrent.futures.as_completed([pool.submit(run,x) for x in enumerate(pending)]):
  x=f.result();done.append(x);p.write_text(''.join(json.dumps(x)+'\n' for x in done));print(x['path'],x['tokens'],flush=True)
assert len(done)==29;by={x['path']:x for x in done};p.write_text(''.join(json.dumps(by[l])+'\n' for l in lanes))
