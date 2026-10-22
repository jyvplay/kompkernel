import fs from 'node:fs';
import { syncopeEncode } from '@/lib/omega/syncope';
import { countTokens } from '@/lib/omega/bpe';
const ENC='o200k_base' as any;
const T=(s:string)=>countTokens(s,ENC);
const OPEN='\u27e6', CLOSE='\u27e7', MARK='\u21e4';

interface Cand{s:number;p:number;k:number;gain:number;ut:number}
function findCands(t:string,minP:number,maxP:number,minK:number):Cand[]{
  const n=t.length; const out:Cand[]=[];
  for(let i=0;i<n;i++){
    let bestP=0,bestK=0,bestVal=0,bestUT=0;
    const lim=Math.min(maxP,(n-i)>>1);
    for(let p=minP;p<=lim;p++){
      let k=1; let ok=true;
      while(i+(k+1)*p<=n){
        for(let q=0;q<p;q++) if(t[i+q]!==t[i+k*p+q]){ok=false;break;}
        if(!ok) break;
        k++;
      }
      if(k>=minK){
        const ut=T(t.slice(i,i+p));
        const val=(k-1)*ut;               // tokens saved by eliding the extra copies
        if(val>bestVal){bestVal=val;bestP=p;bestK=k;bestUT=ut;}
      }
    }
    if(bestP>0) out.push({s:i,p:bestP,k:bestK,gain:bestVal,ut:bestUT});
    if(out.length>20000) break;
  }
  return out;
}
// build in ONE pass from the ORIGINAL text so no marker can ever leak into a unit
function applyAll(t:string,chosen:Cand[]){
  let out=''; let i=0;
  for(const c of chosen){
    out+=t.slice(i,c.s);
    out+=OPEN+c.k+MARK+t.slice(c.s,c.s+c.p)+CLOSE;
    i=c.s+c.p*c.k;
  }
  out+=t.slice(i);
  return out;
}
// wire form:  OPEN <count> MARK <unit> CLOSE   ->  <unit> repeated <count> times
function expand(t:string):string{
  let out=''; let i=0;
  while(i<t.length){
    const a=t.indexOf(OPEN,i);
    if(a<0){ out+=t.slice(i); break; }
    out+=t.slice(i,a);
    const m=/^(\d{1,7})\u21e4/.exec(t.slice(a+1));
    if(!m){ out+=OPEN; i=a+1; continue; }
    const k=parseInt(m[1],10);
    const uStart=a+1+m[0].length;
    const b=t.indexOf(CLOSE,uStart);
    if(b<0){ out+=t.slice(a); break; }
    const unit=t.slice(uStart,b);
    if(!(k>=2&&k<=100000)){ out+=t.slice(a,b+1); i=b+1; continue; }
    out+=unit.repeat(k); i=b+1;
  }
  return out;
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const text=fs.readFileSync(f,'utf8');
  if(text.includes(OPEN)||text.includes(CLOSE)||text.includes(MARK)){console.log(f.split('/').pop(),'marker collision');continue;}
  const base:any=syncopeEncode(text,ENC);
  const OV=Number(process.env.OV||5);   // tokens charged for OPEN+MARK+CLOSE+count
  const MING=Number(process.env.MING||3);
  const MINUT=Number(process.env.MINUT||2);
  const cands=findCands(text,Number(process.env.MINP||2),Number(process.env.MAXP||80),2)
    .map(c=>({...c,gain:c.gain-OV}))
    .filter(c=>c.gain>=MING && c.ut>=MINUT)
    .sort((a,b)=>b.gain-a.gain);
  // greedy non-overlapping
  const taken:number[]=[]; let used=new Uint8Array(text.length);
  for(const c of cands){
    if(c.s+c.p*c.k>text.length) continue;
    let free=true; for(let q=c.s;q<c.s+c.p*c.k;q++) if(used[q]){free=false;break;}
    if(!free) continue;
    for(let q=c.s;q<c.s+c.p*c.k;q++) used[q]=1;
    taken.push(cands.indexOf(c));
  }
  const chosen=taken.map(i=>cands[i]).filter(c=>c.k>=2&&c.k<=100000&&c.p*c.k<=text.length).sort((a,b)=>a.s-b.s);
  const t2=applyAll(text,chosen);
  if(expand(t2)!==text){ console.log(f.split('/').pop()!.padEnd(26),'*** ROUNDTRIP FAIL ***'); continue; }
  const r:any=syncopeEncode(t2,ENC);
  console.log(f.split('/').pop()!.padEnd(26),'base',String(base.messageTokens).padStart(5),
    '-> GRLE',String(r.messageTokens).padStart(5),'=>',String(r.messageTokens-base.messageTokens).padStart(5),
    '| spans',chosen.length, chosen.slice(0,3).map(c=>`p${c.p}x${c.k}`).join(' '));
}
