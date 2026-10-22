import json,os
# PYKNOSIS measurements (this turn), 31 lanes
rows=[]
for fn in ['/tmp/x34/a.jsonl','/tmp/x34/b.jsonl']:
    if not os.path.exists(fn): continue
    for l in open(fn,encoding='utf-8'):
        l=l.strip()
        if not l.startswith('{'): continue
        d=json.loads(l)
        rows.append((d['lane'],d['raw'],d['oiko'],d['pyk']))
# lanes measured inline (not written to a file)
rows += [
 ('holdout-tab/vix-daily-1990.csv',3412,1195,1195),
 ('holdout-tab/aapl-2014.csv',3108,1452,1452),
 ('holdout-tbl/df-h.txt',570,250,250),
 ('holdout-mk/page.html',3220,547,547),
 ('holdout-mk/component.jsx',296,264,264),
 ('holdout/code-ts.txt',1422,969,969),
 ('holdout/gh-api.json.txt',2519,1104,1107),
]
def cat(f):
    # lane names here are two path segments, e.g. 'holdout-ops/git-numstat.txt'
    if 'holdout-ops' in f or f.endswith('.log'): return 'ops-logs'
    if 'holdout-tab' in f or f.endswith('.csv'): return 'tables-CSV'
    if 'holdout-tbl' in f: return 'tables-psql'
    if f.endswith('.sql'): return 'DB-dumps'
    if 'holdout-mk' in f: return 'markup-code'
    if 'fresh/' in f: return 'prose (out-of-sample)'
    if 'holdout-lang' in f: return 'prose non-English'
    if 'holdout/' in f: return 'code (holdout)'
    return 'prose-work'
by={}
for lane,raw,oiko,pyk in rows:
    by.setdefault(cat(lane),[]).append((lane,raw,oiko,pyk))
print('Local leader by structural category — PYKNOSIS (X34), %d lanes' % len(rows))
print('ratio = wire/raw, lower is better.  "PYKNOSIS leads" counts lanes where pyk < oiko.')
print()
hdr=('category','lanes','min ratio','max ratio','median ratio','PYKNOSIS leads')
print('%-24s %5s %10s %10s %12s %14s' % hdr)
print('-'*80)
tot_l=0; tot_g=0
for c in sorted(by):
    rs=sorted(by[c])
    ratios=sorted(p/raw for _,raw,_,p in rs)
    n=len(rs); med=ratios[n//2] if n%2 else (ratios[n//2-1]+ratios[n//2])/2
    lead=sum(1 for _,raw,o,p in rs if p<o)
    tot_l+=n; tot_g+=lead
    print('%-24s %5d %9.1f%% %9.1f%% %11.1f%% %8d/%d' % (c,n,ratios[0]*100,ratios[-1]*100,med*100,lead,n))
print('-'*80)
print('%-24s %5d %10s %10s %12s %8d/%d' % ('TOTAL',tot_l,'','','',tot_g,tot_l))
print()
print('Lanes where PYKNOSIS beats OIKONOMIA (the only two that moved):')
for lane,raw,o,p in sorted(rows,key=lambda r:r[3]-r[2]):
    if p<o: print('  %-42s raw %5d   OIKONOMIA %5d -> PYKNOSIS %5d  (%+d, %.1f%%)' % (lane,raw,o,p,p-o,100*(p-o)/o))
