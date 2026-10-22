import fs from 'node:fs';
const RUNRE=/[0-9a-fA-F]{4,}(?:[-_][0-9a-fA-F]{2,})*|[0-9a-fA-F]{12,}/g;
for(const f of (process.env.LANES||'').split(',').filter(f=>fs.existsSync(f))){
  const t=fs.readFileSync(f,'utf8');
  const nextCh=new Map<string,number>(); let runs=0;
  for(const m of t.matchAll(RUNRE)){
    if(m[0].length<16) continue; runs++;
    const nx=t[m.index!+m[0].length] ?? '<EOF>';
    nextCh.set(nx,(nextCh.get(nx)||0)+1);
  }
  const top=[...nextCh.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  console.log(f.split('/').pop()!.padEnd(26),'runs',String(runs).padStart(4),'| next char:',
    top.map(([c,n])=>JSON.stringify(c)+'x'+n).join(' '));
}
