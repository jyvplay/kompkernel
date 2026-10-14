import sys,re
body=sys.stdin.read().replace('\r\n','\n')
blocks=re.findall(r"```[^\n]*\n(.*?)```", body, re.S)
if not blocks: blocks=[body]
# prefer blocks with many lines AND table-ish (many lines with >=3 whitespace fields)
def score(b):
    ls=[l for l in b.split('\n') if l.strip()]
    tab=sum(1 for l in ls if len(l.split())>=3)
    return (tab, len(ls))
best=max(blocks,key=score)
open(f"bench/z48/corpus/{sys.argv[1]}.txt","w").write(best)
print(sys.argv[1], best.count('\n'), "lines", len(best), "bytes", "tabular", score(best)[0])
