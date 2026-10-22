import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SEP } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const T=(s:string)=>countTokens(s,enc);

for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const tape=w.slice(cut+1);
  const isG=(c:string)=>c.codePointAt(0)!>127;
  // glyph ids
  const ids=new Map<string,number>(); const order:string[]=[];
  for(const c of tape) if(isG(c) && !ids.has(c)){ids.set(c,order.length);order.push(c);}
  const K=order.length;
  if(K<3||K>260){console.log(f.split('/').pop(),'K',K,'skip');continue;}
  // tape as id sequence (-1 = literal)
  const seq:number[]=[]; for(const c of tape) seq.push(isG(c)?ids.get(c)!:-1);
  const baseTok=T(tape);

  // --- adjacency: counts of adjacent glyph-ID pairs and triples
  const pair=new Map<number,number>();
  for(let i=0;i+1<seq.length;i++){
    if(seq[i]>=0&&seq[i+1]>=0){const k=seq[i]*K+seq[i+1];pair.set(k,(pair.get(k)||0)+1);}
  }
  // --- pool: characters to assign. use current glyph chars, plus a CJK block for extra freedom
  const pool:string[]=[...order];
  // extend pool with neighbouring CJK chars to give the search room
  const base=0x4E00; let add=0;
  for(let cp=base;cp<base+4000 && pool.length<Math.min(400,Math.max(140,K*3));cp++){
    const ch=String.fromCodePoint(cp); if(!order.includes(ch)) {pool.push(ch);add++;}
  }
  const P=pool.length;
  // --- merge cost table: cost of 2-char and 3-char strings in pool
  const c2=new Float64Array(P*P);
  for(let a=0;a<P;a++) for(let b=0;b<P;b++) c2[a*P+b]=T(pool[a]+pool[b]);
  // --- objective: sum over adjacent glyph pairs of merge cost of their chars
  const pairsArr=[...pair.entries()].map(([k,n])=>({a:Math.floor(k/K),b:k%K,n}));
  let cur=new Int32Array(K); for(let i=0;i<K;i++)cur[i]=i; // glyph i -> pool index i
  function score(a:Int32Array){
    let s=0; for(const p of pairsArr) s+=p.n*c2[a[p.a]*P+a[p.b]];
    return s;
  }
  let cs=score(cur);
  let best=new Int32Array(cur),bs=cs;
  // simulated annealing on the surrogate
  let seed=987654321;
  const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
  const ITER=Number(process.env.ITER||400000);
  let Temp=3.0;
  for(let it=0;it<ITER;it++){
    if(it%20000===0) Temp=Math.max(0.05,3.0*Math.pow(0.75,it/20000));
    const i=(rnd()*K)|0, j=(rnd()*P)|0;
    if(cur[i]===j) continue;
    const old=cur[i]; cur[i]=j;
    let ns=0;
    for(const p of pairsArr){ if(p.a===i) ns+=p.n*c2[j*P+cur[p.b]]; else if(p.b===i) ns+=p.n*c2[cur[p.a]*P+j]; else ns+=p.n*c2[cur[p.a]*P+cur[p.b]]; }
    const d=ns-cs;
    if(d<0 || rnd()<Math.exp(-d/Temp)){ cs=ns; if(ns<bs){bs=ns;best=new Int32Array(cur);} }
    else cur[i]=old;
  }
  // rebuild tape with best assignment and measure REAL tokens
  const map=new Map<number,string>(); for(let i=0;i<K;i++)map.set(i,pool[best[i]]);
  let nt=''; for(const c of tape) nt+= isG(c)? map.get(ids.get(c)!)! : c;
  const newTok=T(nt);
  console.log(f.split('/').pop()!.padEnd(24),'K',String(K).padStart(3),'pool',String(P).padStart(3),
    '| tapeTok base',String(baseTok).padStart(5),'-> QAP',String(newTok).padStart(5),
    '=>',String(newTok-baseTok).padStart(5),`(${((newTok-baseTok)/baseTok*100).toFixed(1)}%)`);
}
