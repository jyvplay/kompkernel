import json,os
syn={}
for l in open('bench/x28/syntomos.jsonl',encoding='utf-8'):
    l=l.strip()
    if not l: continue
    r=json.loads(l)
    b=r.get('base') or r.get('raw'); s=r.get('syntomos')
    if b and s: syn[r['lane']]= (b,s)
tim={}
if os.path.exists('bench/x32/frontier.jsonl'):
    for l in open('bench/x32/frontier.jsonl',encoding='utf-8'):
        l=l.strip()
        if not l: continue
        r=json.loads(l); tim[r['lane']]=(r['raw'],r['timema'])
# foreground chunk measured this turn
fg=[('bench/holdout-mk/dump.sql',1795,662),('bench/holdout-ops/find-listing.txt',3997,1266),
('bench/holdout-ops/git-log-fuller.txt',143,143),('bench/z20/samples/git-log-iso.txt',1947,1438),
('bench/holdout-ops/git-numstat.txt',4632,1992),('bench/holdout-ops/ls-full-iso.txt',1175,367),
('bench/holdout-ops/node-stacktraces.txt',568,300)]
for k,b,t in fg: tim[k]=(b,t)
def cat(f):
    if '/holdout-ops/' in f or 'ops-' in f or f.endswith('.log'): return 'ops-logs'
    if '/holdout-tab/' in f or f.endswith('.csv'): return 'tables-CSV'
    if '/holdout-tbl/' in f: return 'tables-psql'
    if '/holdout-mk/' in f: return 'markup-code'
    if f.endswith('.sql'): return 'DB-dumps'
    if '/x30/fresh/' in f: return 'prose (out-of-sample)'
    if '/holdout-lang/' in f: return 'prose non-English'
    return 'prose-work'
rows=[]
for lane,(b,s) in syn.items():
    t=tim.get(lane)
    rows.append((cat(lane),lane,b,s,t[1] if t else None))
rows.sort(key=lambda r:(r[0],r[1]))
print(f"{'category':<24}{'lane':<50}{'raw':>6}{'syntomos':>10}{'timema':>8}{'leader':>12}")
cur=None
for c,lane,b,s,t in rows:
    if c!=cur: print('-'*110); cur=c
    if t is None:
        lead='syntomos*'; ts='   (tbd)'
    else:
        ts=str(t); lead='timema' if t<=s else 'syntomos'
    print(f"{c:<24}{lane.split('/')[-1]:<50}{b:>6}{s:>10}{ts:>8}{lead:>12}")
print('\n* timema not yet measured on this lane (sweep incomplete); leader shown is the X28 value.')
