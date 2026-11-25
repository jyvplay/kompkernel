"""Explicit source-role view, alongside (not replacing) inherited X133 labels."""
import json
from pathlib import Path
p=Path('bench/x181/receipts');rows=json.loads((p/'leaders.json').read_text())['rows'];groups={}
for r in rows:
 name=Path(r['path']).name
 category='PROSE' if name in ['kb-article.txt','email-thread.txt','llm-answer.md'] else 'CODE/STRUCT' if name in ['code-ts.txt','json-pkg.txt','unified-diff.patch'] else 'OTHER' if name=='cue-sheet.md' else 'OPS/TABULAR'
 x=dict(r,inheritedCategory=r['category'],category=category);groups.setdefault(category,[]).append(x)
out={}
for category,rs in groups.items():
 def entry(r):return dict(path=r['path'],raw=r['raw'],tokens=r['tokens'],saved=r['raw']-r['tokens'])
 classes={k:sum(r['classes'][k] for r in rs if r['hasTape']) for k in ['glyph','word','num','other']}
 out[category]=dict(lanes=len(rs),aggregateRaw=sum(r['raw'] for r in rs),aggregateTokens=sum(r['tokens'] for r in rs),largestAbsoluteSaving=entry(max(rs,key=lambda r:r['raw']-r['tokens'])),largestRelativeSaving=entry(max(rs,key=lambda r:(r['raw']-r['tokens'])/r['raw'])),tapeBodyTokenClassLeader=max(classes,key=classes.get) if any(classes.values()) else None,rows=rs)
assert sum(g['aggregateTokens'] for g in out.values())==11962
(p/'source-role-leaders.json').write_text(json.dumps(dict(note='Explicit fixture-role classification; apt, node-help, dpkg and system summaries are ops, not prose. Not per-codec ablation or a global optimum.',groups=out),indent=2));print({k:(r['lanes'],r['aggregateRaw'],r['aggregateTokens'],r['tapeBodyTokenClassLeader']) for k,r in out.items()})
