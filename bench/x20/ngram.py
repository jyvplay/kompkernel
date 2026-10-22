import sys, re
from collections import Counter
LANES=['bench/holdout-work/llm-answer.md','bench/holdout/readme.txt','bench/holdout-work/kb-article.txt',
       'bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md',
       'bench/holdout-work/email-thread.txt','bench/holdout-ops/node-stacktraces.txt','bench/holdout-work/bibliography.txt']
def top_substrings(s, lo=4, hi=28, topn=14):
    n=len(s)
    # suffix-automaton-free: count with dict for window sizes, subsample long files
    c=Counter()
    for L in range(lo, hi+1):
        seen=Counter()
        for i in range(0, min(n-L, 400000)):
            g=s[i:i+L]
            seen[g]+=1
        for g,k in seen.items():
            if k>=3: c[g]+=k
    # score: occurrences * length, but penalise substrings contained in a longer winner
    items=sorted(c.items(), key=lambda kv: -(kv[1]*len(kv[0])))
    out=[]
    for g,k in items:
        if any(g in o for o,_ in out): continue
        out.append((g,k))
        if len(out)>=topn: break
    return out
for f in LANES:
    try: s=open(f,encoding='utf-8',errors='replace').read()
    except OSError: continue
    print('='*70); print(f.split('/')[-1], len(s),'chars')
    for g,k in top_substrings(s):
        print(f'  x{k:<4d} {len(g):>2d}ch  {g!r}')
