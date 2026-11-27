"""Offline handoff/scorer. Does not call a model or certify response provenance."""
import argparse,json,hashlib,secrets,tempfile
from pathlib import Path
ROOT=Path('bench/x190/native')
def sha(b):return hashlib.sha256(b).hexdigest()
def score(cases,responses):
 rows=[]
 for c in cases:
  if 'prompt' in c:assert sha(Path(c['prompt']).read_bytes())==c['promptSha256'],'changed prompt'
  p=Path(responses)/(c['id']+'.txt')
  if not p.exists():rows.append(dict(id=c['id'],status='NOT_RUN'));continue
  actual=p.read_bytes();expected=Path(c['expected']).read_bytes()
  assert sha(expected)==c['expectedSha256'],'changed source'
  rows.append(dict(id=c['id'],status='exact' if actual==expected else 'mismatch',responseSha256=sha(actual),responseBytes=len(actual),expectedBytes=len(expected)))
 return rows
def build():
 if (ROOT/'grader-manifest.json').exists():raise ValueError('Existing packet: refusing to silently change challenge IDs')
 public=ROOT/'public'
 if public.exists() and any(public.iterdir()):raise ValueError('Nonempty public folder: refusing ambiguous or stale challenges')
 public.mkdir(parents=True,exist_ok=True);cases=[]
 def add(x,kind):
  cid=secrets.token_hex(8)
  while (public/(cid+'.txt')).exists():cid=secrets.token_hex(8)
  b=x['message'].encode();expected=Path(x['path']).read_bytes()
  assert all(c['promptSha256']!=sha(b) or c['expectedSha256']==sha(expected) for c in cases),'one prompt has distinct expected sources'
  (public/(cid+'.txt')).write_bytes(b)
  cases.append(dict(id=cid,kind=kind,prompt=str(public/(cid+'.txt')),promptSha256=sha(b),expected=x['path'],expectedSha256=sha(expected),tokens=x['tokens']))
 for x in map(json.loads,Path('bench/x190/receipts/frontier.jsonl').read_text().splitlines()):
  assert x['decoded'].encode()==Path(x['path']).read_bytes();add(x,'canonical')
 assert len(cases)==29
 independent=json.loads(Path('bench/x190/receipts/independent.json').read_text())
 for r in independent['paid']:
  if r['status']!='exact':continue
  x=json.loads(Path(r['file']).read_text())
  if x['status']=='exact':add(x,'dipigi')
 (ROOT/'grader-manifest.json').write_text(json.dumps(cases,indent=2))
 (ROOT/'status.json').write_text(json.dumps(dict(status='NOT_RUN',cases=len(cases),canonical=29,candidates=len(cases)-29,reason='No separate model endpoint invoked. Share only public prompt bytes with a source-blind participant; grader/source files must be inaccessible.'),indent=2))
 print('Prepared',len(cases),'handoffs; no native model executed')
def selftest():
 with tempfile.TemporaryDirectory() as d:
  p=Path(d);source=p/'source';source.write_bytes(b'a  b\r\n');cases=[dict(id='one',expected=str(source),expectedSha256=sha(source.read_bytes()))]
  assert score(cases,p)[0]['status']=='NOT_RUN'
  for wrong in [b'a b\r\n',b'a  b\n',b'```\na  b\r\n```',b'Exactly decoded.',b'a  b\r\n\n']:
   (p/'one.txt').write_bytes(wrong);assert score(cases,p)[0]['status']=='mismatch'
  (p/'one.txt').write_bytes(source.read_bytes());assert score(cases,p)[0]['status']=='exact'
  source.write_bytes(b'changed')
  try:score(cases,p)
  except AssertionError:pass
  else:raise AssertionError('source drift accepted')
  source.write_bytes(b'a  b\r\n');prompt=p/'prompt';prompt.write_bytes(b'original prompt');cases[0].update(prompt=str(prompt),promptSha256=sha(prompt.read_bytes()));prompt.write_bytes(b'changed prompt')
  try:score(cases,p)
  except AssertionError:pass
  else:raise AssertionError('prompt drift accepted')
 sources=[b'a b\n',b'a  b\n',b'a b\r\n'];assert len(set(sources))==3;assert len({b' '.join(x.split()) for x in sources})==1
 print('11 scorer/modal unit checks; synthetic fixtures, NOT model responses')
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('action',choices=['build','selftest','score']);ap.add_argument('--responses');ap.add_argument('--metadata');a=ap.parse_args()
 if a.action=='build':build()
 elif a.action=='selftest':selftest()
 else:
  if not a.responses or not a.metadata:ap.error('score requires raw response directory and metadata JSON')
  meta=json.loads(Path(a.metadata).read_text())
  for field in ['model','configuration','runTimeUTC','operator','sourceIsolation']:assert isinstance(meta.get(field),str) and meta[field].strip(),field
  cases=json.loads((ROOT/'grader-manifest.json').read_text());rows=score(cases,a.responses)
  result=dict(metadata=meta,provenance='operator-supplied, not independently authenticated',rows=rows,allExact=all(x['status']=='exact' for x in rows))
  (ROOT/'scores.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
