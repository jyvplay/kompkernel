import fs from 'node:fs';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironParseTape, chironInScript, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const ENC='o200k_base' as any;
const T=(s:string)=>countTokens(s,ENC);

function scriptOf(ch:string){ for(const s of CHIRON_SCRIPTS) if(chironInScript(s,ch.codePointAt(0)!)) return s; return null; }

for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const text=fs.readFileSync(f,'utf8');
  const r:any=anadiplosisEncode(text,ENC);
  const wire=String(r.wire);
  if(!wire.startsWith(CHIRON_START)){console.log(f.split('/').pop(),'not chiron');continue;}
  const cut=wire.indexOf(CHIRON_SEP,CHIRON_START.length);
  const gloss=wire.slice(CHIRON_START.length,cut);
  const sc=scriptOf(gloss[0]); if(!sc){console.log(f.split('/').pop(),'no script');continue;}
  const parsed=chironParseTape(gloss,sc); if(!parsed){console.log(f.split('/').pop(),'parse fail');continue;}
  const N=parsed.length;
  if(N<4){console.log(f.split('/').pop()!.padEnd(26),'N',N,'too few rules');continue;}
  // entries as (glyph,raw) pairs; glossary string = concat(glyph+raw)
  const entries=parsed.map(p=>p.glyph+p.raw);
  const cur=entries.join('');
  const base=T(cur);
  // cost between i and j: tokens(entry_i + entry_j) - tokens(entry_i) - tokens(entry_j)
  const ei=entries.map(e=>T(e));
  const c:number[][]=Array.from({length:N},()=>new Array(N).fill(0));
  for(let i=0;i<N;i++) for(let j=0;j<N;j++) if(i!==j) c[i][j]=T(entries[i]+entries[j])-ei[i]-ei[j];
  // objective: sum of consecutive pair costs (approximation; true is full tokenization)
  let order=Array.from({length:N},(_,i)=>i);
  const score=(o:number[])=>{let s=0;for(let i=0;i+1<o.length;i++)s+=c[o[i]][o[i+1]];return s;};
  // greedy nearest-neighbour from each of a few starts, then 2-opt
  let bestOrd=order.slice(),bestS=score(order);
  for(const st of [0,1,Math.floor(N/2),N-1]){
    const vis=new Uint8Array(N); const o:number[]=[st]; vis[st]=1;
    for(let k=1;k<N;k++){ let bj=-1,bv=Infinity;
      for(let j=0;j<N;j++) if(!vis[j]&&c[o[o.length-1]][j]<bv){bv=c[o[o.length-1]][j];bj=j;}
      o.push(bj); vis[bj]=1; }
    let s=score(o);
    // 2-opt
    let imp=true,guard=0;
    while(imp&&guard++<40){ imp=false;
      for(let a=0;a+1<N;a++) for(let b=a+1;b<N;b++){
        const d=-c[o[a]][o[a+1]]-(b+1<N?c[o[b]][o[b+1]]:0)+c[o[a]][o[b]]+(b+1<N?c[o[a+1]][o[b+1]]:0);
        if(d<-1e-9){ const seg=o.slice(a+1,b+1).reverse(); o.splice(a+1,b-a,...seg); s+=d; imp=true; } } }
    if(s<bestS){bestS=s;bestOrd=o.slice();}
  }
  const newGloss=bestOrd.map(i=>entries[i]).join('');
  const nt=T(newGloss);
  console.log(f.split('/').pop()!.padEnd(26),'rules',String(N).padStart(4),
    '| glossary tok base',String(base).padStart(5),'-> reordered',String(nt).padStart(5),
    '=>',String(nt-base).padStart(5),`(${((nt-base)/Math.max(base,1)*100).toFixed(1)}%)`);
}
