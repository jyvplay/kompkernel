import json,pathlib
p=pathlib.Path('bench/x137/receipts')
def rows(name):return [json.loads(l)for l in (p/(name+'.jsonl')).read_text().splitlines()]
a=rows('frontier');old={r['path']:r for r in map(json.loads,pathlib.Path('bench/x136/receipts/patched-frontier.jsonl').read_text().splitlines())}
assert len(a)==29 and all(r['message']==old[r['path']]['message']for r in a)
assert all(r['decoded'].encode()==pathlib.Path(r['path']).read_bytes()for r in a)
selected={r['path']:dict(r)for r in a}
for r in rows('overflow'):
 if r.get('sourceExact') and r['B']<selected[r['path']]['tokens']:selected[r['path']].update(message=r['message'],tokens=r['B'])
(p/'selected-frontier.jsonl').write_text(''.join(json.dumps(r)+'\n'for r in selected.values()))
summary={'baseline':{'lanes':len(a),'tokens':sum(r['tokens']for r in a),'ms':sum(r['ms']for r in a),'identicalToX136':29},'offlineKremaSelectionTokens':sum(r['tokens']for r in selected.values()),'experimentalPtycheComparatorTokens':11950,'newCodecDefaultWired':False,'nativeVerified':False,'paretoAccepted':False,'merged':False,'warnings':['Offline selection is not free search','Heldout Node help substantially overlaps canonical Node help','Timings with simultaneous processes are not controlled speed evidence','All-codec semantic novelty audit incomplete']}
(p/'summary.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
