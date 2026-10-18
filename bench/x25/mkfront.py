import json,sys
m={}
for fn in ['bench/x24/psephos-0.jsonl','bench/x24/psephos-1.jsonl']:
    for l in open(fn):
        l=l.strip()
        if l:
            d=json.loads(l); m[d['file'].split('/')[-1]]=d['psephosM']
json.dump(m,open('bench/x25/psephos_frontier.json','w'))
print('frontier',len(m),sum(m.values()))
