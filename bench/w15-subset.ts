import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { CHIRON_START, chironDecode } from '../src/lib/omega/chiron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const B=80;
const ARMS:Array<[string,(t:string)=>any]>=[
 ['ar',      t=>ariadneEncode(t,ENC,{budgetMs:B})],
 ['ar-nb',   t=>ariadneEncode(t,ENC,{budgetMs:B,noBlocks:true} as any)],
 ['ar-s16',  t=>ariadneEncode(t,ENC,{budgetMs:B,maxSpan:16} as any)],
 ['ar-s64',  t=>ariadneEncode(t,ENC,{budgetMs:B,maxSpan:64} as any)],
 ['ar-L4',   t=>ariadneEncode(t,ENC,{budgetMs:B,levels:4} as any)],
 ['sb',      t=>sibylEncode(t,ENC,{budgetMs:B})],
 ['sb-w1',   t=>sibylEncode(t,ENC,{budgetMs:B,wordGrid:[1]} as any)],
 ['sb-w3',   t=>sibylEncode(t,ENC,{budgetMs:B,wordGrid:[3]} as any)],
 ['sb-w6',   t=>sibylEncode(t,ENC,{budgetMs:B,wordGrid:[6]} as any)],
 ['sb-w12',  t=>sibylEncode(t,ENC,{budgetMs:B,wordGrid:[12]} as any)],
 ['sb-s64',  t=>sibylEncode(t,ENC,{budgetMs:B,maxSpan:64} as any)],
 ['ep',      t=>epistemeEncode(t,ENC,{budgetMs:B} as any)],
];
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
// matrix[lane][arm] = message tokens with the SYNTOMIA contract where the wire is a CHIRON wire
const M:number[][]=[]; const RAW:number[]=[]; const MTR:number[]=[]; const MS:number[][]=[];
for(const [n,t] of files){
  const raw=T(t); RAW.push(raw);
  let mt=raw; try{const r=metatronEncode(t,ENC,{budgetMs:2000}); if(r.decoded===t) mt=Math.min(raw,r.messageTokens);}catch{}
  MTR.push(mt);
  const row:number[]=[]; const ms:number[]=[];
  for(const [nm,fn] of ARMS){
    const t0=Date.now(); let v=raw;
    try{ const r=fn(t);
      if(r&&r.decoded===t&&typeof r.messageTokens==='number'){
        v=Math.min(raw,r.messageTokens);
        if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t){
          v=Math.min(v, T(r.wire)+T(syntomiaContract(r.wire,t)));   // + contract minimisation
        }
      }
    }catch{}
    row.push(v); ms.push(Date.now()-t0);
  }
  M.push(row); MS.push(ms);
  console.log(n.padEnd(24),'raw',String(raw).padStart(5),'MTR',String(mt).padStart(5),'best',String(Math.min(...row)).padStart(5),'arm',ARMS[row.indexOf(Math.min(...row))][0]);
}
console.log('\nper-arm mean ms:', ARMS.map((a,i)=>`${a[0]}:${Math.round(MS.reduce((s,r)=>s+r[i],0)/MS.length)}`).join(' '));
// best fixed subset of size k (exhaustive for k<=4, greedy after)
function totalFor(sub:number[]){ let s=0; for(let i=0;i<M.length;i++) s+=Math.min(MTR[i],...sub.map(j=>M[i][j])); return s; }
const mtrTot=MTR.reduce((a,b)=>a+b,0), rawTot=RAW.reduce((a,b)=>a+b,0);
console.log(`\nraw=${rawTot} METATRON=${mtrTot} best-of-all-12=${totalFor(ARMS.map((_,i)=>i))}`);
let cur:number[]=[];
for(let k=1;k<=6;k++){
  let bi=-1,bv=1e9;
  for(let j=0;j<ARMS.length;j++){ if(cur.includes(j))continue; const v=totalFor([...cur,j]); if(v<bv){bv=v;bi=j;} }
  cur=[...cur,bi];
  const ms=Math.round(MS.reduce((s,r)=>s+cur.reduce((a,j)=>a+r[j],0),0)/MS.length);
  console.log(`greedy k=${k}: [${cur.map(i=>ARMS[i][0]).join(',')}] total=${bv} (vs MTR ${mtrTot}, Δ=${mtrTot-bv}, ${((mtrTot-bv)/mtrTot*100).toFixed(2)}%)  mean ${ms}ms/doc`);
}
