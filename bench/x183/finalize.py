import json,hashlib,importlib.util,collections
from pathlib import Path
from independent import undo
root=Path('bench/x183');r=root/'receipts'
def load(p):return json.loads(Path(p).read_text())
def lines(p):return [json.loads(s) for s in Path(p).read_text().splitlines()]
a={x['path']:x for x in lines('bench/x182/receipts/frontier.jsonl')};b={x['path']:x for x in lines(r/'frontier.jsonl')}
assert len(a)==len(b)==29 and a.keys()==b.keys()
assert all(a[p]['message']==b[p]['message'] for p in a)
assert all(x['decoded'].encode()==Path(p).read_bytes() for p,x in b.items())
spec=importlib.util.spec_from_file_location('reader','bench/x182/cue-reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
front=[]
for p,x in b.items():
 try:s=reader.parent_read(x['message'])
 except ValueError as e:front.append(dict(path=p,status='unsupported',error=str(e)));continue
 assert s.encode()==Path(p).read_bytes();front.append(dict(path=p,status='exact'))
paid=[]
for f in sorted(r.glob('paid-[0-9][0-9].json')):
 x=load(f);entry=dict(path=x['path'],mode=x['mode'],tokens=x['tokens'],baseline=a[x['path']]['tokens'],tsReader=x['status'])
 try:s=undo(reader.parent_read(x['parent']))
 except (ValueError,AssertionError) as e:entry.update(pythonReader='unsupported',error=str(e))
 else:assert s.encode()==Path(x['path']).read_bytes();entry['pythonReader']='exact'
 paid.append(entry)
screen=load(r/'screen.json');summary=dict(accepted=False,frontier=dict(lanes=29,tokens=sum(x['tokens'] for x in b.values()),identical=29,pythonReaders=dict(collections.Counter(x['status'] for x in front))),unitChecks=screen['checks'],sources=len(screen['rows']),independent=load(r/'independent.json'),paid=paid,paidWins=[x for x in paid if x['tokens']<x['baseline']],processCounts=dict(collections.Counter(x['status'] for x in load(r/'paid-processes.json'))),native='NOT_RUN',speed='NOT_RUN',allStackNovelty='NOT_ESTABLISHED')
(r/'summary.json').write_text(json.dumps(summary,indent=2));(r/'python-frontier.json').write_text(json.dumps(front,indent=2));print(json.dumps(summary,indent=2))
