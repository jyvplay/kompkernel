import fs from 'node:fs';
import { syncopeEncode } from '@/lib/omega/syncope';
import { oikonomiaDecode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, chironInScript, CHIRON_SCRIPTS, type ChironScript } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const T=(s:string)=>countTokens(s,enc);
const POLY=CHIRON_SCRIPTS.find(s=>s.name==='polyglot')!;
const CJK=CHIRON_SCRIPTS.find(s=>s.name==='cjk')!;

function poolFor(sc:ChironScript,limit:number,used:Set<string>):string[]{
  const out:string[]=[];
  const push=(cp:number)=>{const ch=String.fromCodePoint(cp); if(!used.has(ch)&&T(ch)===1) out.push(ch);};
  if(sc.ranges) for(const [a,b] of sc.ranges) for(let cp=a;cp<b&&out.length<limit;cp++) push(cp);
  else for(let cp=sc.lo;cp<sc.hi&&out.length<limit;cp++) push(cp);
  return out;
}

for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const text=fs.readFileSync(f,'utf8');
  const r:any=syncopeEncode(text,enc);
  const wire=String(r.wire);
  if(!wire.startsWith(CHIRON_START)){console.log(f.split('/').pop(),'not chiron wire');continue;}
  const cut=wire.indexOf(CHIRON_SEP,CHIRON_START.length);
  if(cut<0){console.log(f.split('/').pop(),'no sep');continue;}
  const gloss=wire.slice(CHIRON_START.length,cut);
  const body=wire.slice(cut+CHIRON_SEP.length);
  // glyphs = chars of the wire that are in some chiron script
  const inAny=(cp:number)=>CHIRON_SCRIPTS.some(s=>chironInScript(s,cp));
  const glyphs:string[]=[]; const gset=new Set<string>();
  for(const c of wire) if(inAny(c.codePointAt(0)!)&&!gset.has(c)){gset.add(c);glyphs.push(c);}
  const K=glyphs.length;
  if(K<4){console.log(f.split('/').pop(),'K',K,'skip');continue;}
  const gi=new Map<string,number>(); glyphs.forEach((c,i)=>gi.set(c,i));
  const isG=(c:string)=>gset.has(c);
  // adjacency pairs over the WHOLE wire
  const pair=new Map<number,number>();
  for(let i=0;i+1<wire.length;i++) if(isG(wire[i])&&isG(wire[i+1])){
    const k=gi.get(wire[i])!*K+gi.get(wire[i+1])!; pair.set(k,(pair.get(k)||0)+1);
  }
  const pairs=[...pair.entries()].map(([k,n])=>({a:Math.floor(k/K),b:k%K,n}));
  const P0=Math.min(Number(process.env.POOL||420), Math.max(160,K*4));
  let bestGain=0,bestWire=wire,bestName='';
  for(const [sname,sc] of [['polyglot',POLY],['cjk',CJK]] as [string,ChironScript][]){
    const pool=poolFor(sc,P0,gset);
    if(pool.length<K+8) continue;
    const P=pool.length;
    const c2=new Float64Array(P*P);
    for(let a=0;a<P;a++) for(let b=0;b<P;b++) c2[a*P+b]=T(pool[a]+pool[b]);
    let cur=new Int32Array(K); for(let i=0;i<K;i++)cur[i]=i;
    const usedP=new Uint8Array(P); for(let i=0;i<K;i++)usedP[i]=1;
    const byA:number[][]=Array.from({length:K},()=>[]);
    const byB:number[][]=Array.from({length:K},()=>[]);
    for(let idx=0;idx<pairs.length;idx++){byA[pairs[idx].a].push(idx);byB[pairs[idx].b].push(idx);}
    let cs=0; for(const p of pairs) cs+=p.n*c2[cur[p.a]*P+cur[p.b]];
    let bs=cs, best=new Int32Array(cur);
    let seed=987654321+f.length; const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
    const ITER=Number(process.env.ITER||120000);
    let Temp=2.5;
    for(let it=0;it<ITER;it++){
      if(it%15000===0) Temp=Math.max(0.04,2.5*Math.pow(0.7,it/15000));
      const i=(rnd()*K)|0;
      // move-only: relocate glyph i to an UNUSED pool slot. This keeps the
      // incremental delta exact (only i's edges change) and keeps the map
      // injective by construction.
      let j=-1;
      for(let t=0;t<12;t++){ const c=(rnd()*P)|0; if(!usedP[c]){ j=c; break; } }
      if(j<0||cur[i]===j) continue;
      const old=cur[i];
      cur[i]=j; usedP[old]=0; usedP[j]=1;
      let oldSum=0,newSum=0;
      for(const idx of byA[i]){const p=pairs[idx]; oldSum+=p.n*c2[old*P+cur[p.b]]; newSum+=p.n*c2[j*P+cur[p.b]];}
      for(const idx of byB[i]){const p=pairs[idx]; if(p.a!==i){oldSum+=p.n*c2[cur[p.a]*P+old]; newSum+=p.n*c2[cur[p.a]*P+j];}}
      const d=newSum-oldSum; const ns=cs+d;
      if(d<0||rnd()<Math.exp(-d/Temp)){ cs=ns; if(ns<bs){bs=ns;best=new Int32Array(cur);} }
      else { cur[i]=old; usedP[j]=0; usedP[old]=1; }
    }
    const seen=new Set<number>(); let dup=false;
    for(let i=0;i<K;i++){ if(seen.has(best[i])) dup=true; seen.add(best[i]); }
    if(dup){ console.log(f.split('/').pop(),'DUP assignment, skipping',sname); continue; }
    const map=new Map<string,string>(); for(let i=0;i<K;i++)map.set(glyphs[i],pool[best[i]]);
    let nw=''; for(const c of wire) nw+= map.get(c) ?? c;
    const nt=T(nw);
    const gain=nt-T(wire);
    if(gain<bestGain){bestGain=gain;bestWire=nw;bestName=sname;}
  }
  // byte-exact check
  let ok=false;
  try{
    const mid=oikonomiaDecode(bestWire,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode});
    ok = mid===text;
  }catch(e){ok=false;}
  console.log(f.split('/').pop()!.padEnd(24),'K',String(K).padStart(3),
    '| wire',String(T(wire)).padStart(5),'->',String(T(bestWire)).padStart(5),
    'gain',String(bestGain).padStart(5),`(${bestName})`,ok?'EXACT':'*** FAIL ***');
}
