/** Do documents contain LONG repeats the span miner (maxSpan=24 symbols) misses? */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function sa(s:string){const n=s.length;const a=Array.from({length:n},(_,i)=>i);let r=new Int32Array(n);
  for(let i=0;i<n;i++)r[i]=s.charCodeAt(i);const t=new Int32Array(n);
  for(let k=1;k<2*n;k<<=1){const c=(x:number,y:number)=>{if(r[x]!==r[y])return r[x]-r[y];
    const rx=x+k<n?r[x+k]:-1,ry=y+k<n?r[y+k]:-1;return rx-ry;};a.sort(c);t[a[0]]=0;
    for(let i=1;i<n;i++)t[a[i]]=t[a[i-1]]+(c(a[i-1],a[i])<0?1:0);r.set(t);if(r[a[n-1]]===n-1)break;}
  return a;}
function lcp(s:string,a:number[]){const n=s.length,rk=new Int32Array(n),L=new Array<number>(n).fill(0);let h=0;
  for(let i=0;i<n;i++)rk[a[i]]=i;
  for(let i=0;i<n;i++){if(rk[i]>0){const j=a[rk[i]-1];while(i+h<n&&j+h<n&&s[i+h]===s[j+h])h++;L[rk[i]]=h;if(h>0)h--;}else h=0;}
  return L;}
/** longest repeats, greedily non-overlapping, length >= minLen */
function longRepeats(s:string,minLen=40,maxOut=60){
  const n=s.length; if(n<2*minLen) return [] as Array<{sub:string;cnt:number}>;
  const A=sa(s),L=lcp(s,A);
  const cands=new Map<string,number>();
  for(let i=1;i<n;i++){ if(L[i]>=minLen){ const sub=s.substr(A[i],Math.min(L[i],2000)); const p=cands.get(sub)??0; if(!p) cands.set(sub,0); } }
  const out:Array<{sub:string;cnt:number}>=[];
  for(const sub of cands.keys()){
    let c=0,i=0; for(;;){const j=s.indexOf(sub,i); if(j<0)break; c++; i=j+sub.length;}
    if(c>=2) out.push({sub,cnt:c});
  }
  out.sort((a,b)=>(b.cnt-1)*T(b.sub)-(a.cnt-1)*T(a.sub));
  // drop candidates contained in an already-kept longer one
  const kept:Array<{sub:string;cnt:number}>=[];
  for(const c of out){ if(kept.some(k=>k.sub.includes(c.sub))) continue; kept.push(c); if(kept.length>=maxOut) break; }
  return kept;
}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>400&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'longReps'.padStart(9),'maxLen'.padStart(7),'naiveGain'.padStart(10),'%raw'.padStart(6),'top');
let tot=0;
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:2000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  const reps=longRepeats(t,40,40);
  if(!reps.length){ console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),'0'.padStart(9)); continue; }
  // naive upper bound: each rule saves (cnt-1)*T(sub) - 1 - cnt*0.5
  let gain=0; for(const r of reps){ const g=(r.cnt-1)*T(r.sub)-1-r.cnt*0.5; if(g>0) gain+=g; }
  tot+=gain;
  const maxLen=Math.max(...reps.map(r=>r.sub.length));
  console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(reps.length).padStart(9),String(maxLen).padStart(7),
    String(Math.round(gain)).padStart(10),((100*gain)/raw).toFixed(1).padStart(6),JSON.stringify(reps[0].sub.slice(0,46))+`x${reps[0].cnt}`);
}
console.log(`\ntotal naive long-repeat value across corpus: ${Math.round(tot)} tokens`);
