const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const byId=new Map(p.nodes.map(n=>[n.id,n]));
const parent=new Map();
for(const n of p.nodes) for(const c of (n.children||[])) parent.set(c,n.id);
const self=new Map(), incl=new Map();
for(let i=0;i<p.samples.length;i++){const id=p.samples[i];const dt=p.timeDeltas[i]||0;
 self.set(id,(self.get(id)||0)+dt);}
for(const [id,t] of self){ let cur=id; const seen=new Set();
  while(cur!==undefined && !seen.has(cur)){ seen.add(cur);
    const cf=byId.get(cur)?.callFrame; if(!cf) break;
    const key=cf.functionName||'(anon)';
    incl.set(key,(incl.get(key)||0)+t);
    cur=parent.get(cur); }}
const tot=[...self.values()].reduce((a,b)=>a+b,0);
console.log(`total sampled ${(tot/1000).toFixed(0)} ms\n--- INCLUSIVE (self+callees) ---`);
[...incl.entries()].sort((a,b)=>b[1]-a[1]).slice(0,18).forEach(([k,t])=>
 console.log(`${(t/1000).toFixed(0).padStart(7)} ms ${(100*t/tot).toFixed(1).padStart(5)}%  ${k}`));
const ss=[...self.entries()].map(([id,t])=>[byId.get(id)?.callFrame?.functionName||'(anon)',t]);
const sm=new Map(); for(const [k,t] of ss) sm.set(k,(sm.get(k)||0)+t);
console.log('\n--- SELF ---');
[...sm.entries()].sort((a,b)=>b[1]-a[1]).slice(0,14).forEach(([k,t])=>
 console.log(`${(t/1000).toFixed(0).padStart(7)} ms ${(100*t/tot).toFixed(1).padStart(5)}%  ${k}`));
