const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const byId=new Map(p.nodes.map(n=>[n.id,n]));
const self=new Map();
for(let i=0;i<p.samples.length;i++){const id=p.samples[i];const dt=p.timeDeltas[i]||0;self.set(id,(self.get(id)||0)+dt);}
const agg=new Map();
for(const [id,t] of self){const n=byId.get(id);if(!n)continue;const cf=n.callFrame;
 const key=`${cf.functionName||'(anon)'} @${(cf.url||'').split('/').slice(-1)[0]}:${cf.lineNumber+1}`;
 agg.set(key,(agg.get(key)||0)+t);}
const tot=[...agg.values()].reduce((a,b)=>a+b,0);
console.log(`total sampled ${(tot/1000).toFixed(0)} ms`);
[...agg.entries()].sort((a,b)=>b[1]-a[1]).slice(0,22).forEach(([k,t])=>
 console.log(`${(t/1000).toFixed(0).padStart(7)} ms ${(100*t/tot).toFixed(1).padStart(5)}%  ${k}`));
