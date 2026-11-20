import pathlib,json,hashlib
p=pathlib.Path('bench/x138/receipts')
def rows(name):return [json.loads(l)for l in (p/(name+'.jsonl')).read_text().splitlines()]
a=rows('frontier');assert len(a)==29,'Fresh frontier not complete'
b={r['path']:r for r in map(json.loads,pathlib.Path('bench/x137/receipts/frontier.jsonl').read_text().splitlines())}
assert all(r['message']==b[r['path']]['message'] for r in a)
assert all(r['decoded'].encode()==pathlib.Path(r['path']).read_bytes() for r in a)
r=rows('probe-repaired');priced=[x for x in r if 'B'in x];held=rows('repriced-heldout');controls=rows('controls');morph=rows('morph')
summary={'frontier':{'lanes':len(a),'tokens':sum(x['tokens']for x in a),'ms':sum(x['ms']for x in a),'identicalToX137':len(a)},'canonical':{str(mode):{'trials':sum(x['overlap']==mode for x in priced),'wins':sum(x['overlap']==mode and x['B']<x['A']for x in priced),'sumDelta':sum(x['B']-x['A']for x in priced if x['overlap']==mode),'extensionMs':sum(x['ms']for x in priced if x['overlap']==mode)}for mode in [False,True]},'controls':{'lanes':len(controls),'brotliTokens':sum(x['brotliTokens']for x in controls),'backwardCopyTokens':sum(x['copyTokens']for x in controls),'morphTokens':sum(x['B']for x in morph)},'newDefaultWired':False,'nativeVerified':False,'paretoAccepted':False,'mergeAllowed':False}
(p/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
# Keep useful existing-codec gain separate from new-codec claim.
trial=next(r for r in rows('heldout') if r.get('kind')=='KREMA' and r.get('B',10**9)<r.get('A',0))
(p/'native-existing-krema-message.txt').write_text(trial['message'])
(p/'native-trial.json').write_text(json.dumps({'status':'NOT RUN','codec':'existing X137 KREMA, not SYNAPHE','path':trial['path'],'tokens':trial['B'],'sourceSha256':hashlib.sha256(pathlib.Path(trial['path']).read_bytes()).hexdigest(),'messageSha256':hashlib.sha256(trial['message'].encode()).hexdigest(),'protocol':'One basic chat user message only; no tools/previous context/skills.md/additional decoder instruction. Save raw response bytes, model/version and provenance. Byte score does not itself prove blind collection.'},indent=2))
# All-source lexical inventory is not a semantic novelty certificate.
inv=json.loads((p/'novelty-inventory.json').read_text())
for x in inv['files']:x['sha256']=hashlib.sha256(pathlib.Path(x['file']).read_bytes()).hexdigest()
(p/'novelty-inventory.json').write_text(json.dumps(inv,indent=2))
