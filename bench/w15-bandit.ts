import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
type Arm={name:string;fn:(t:string,b:number)=>any};
const ARMS:Arm[]=[
 {name:'ar',        fn:(t,b)=>ariadneEncode(t,ENC,{budgetMs:b})},
 {name:'ar-nb',     fn:(t,b)=>ariadneEncode(t,ENC,{budgetMs:b,noBlocks:true} as any)},
 {name:'ar-s16',    fn:(t,b)=>ariadneEncode(t,ENC,{budgetMs:b,maxSpan:16} as any)},
 {name:'ar-s64',    fn:(t,b)=>ariadneEncode(t,ENC,{budgetMs:b,maxSpan:64} as any)},
 {name:'ar-L4',     fn:(t,b)=>ariadneEncode(t,ENC,{budgetMs:b,levels:4} as any)},
 {name:'ar-K64',    fn:(t,b)=>ariadneEncode(t,ENC,{budgetMs:b,topK:64} as any)},
 {name:'sb',        fn:(t,b)=>sibylEncode(t,ENC,{budgetMs:b})},
 {name:'sb-w1',     fn:(t,b)=>sibylEncode(t,ENC,{budgetMs:b,wordGrid:[1]} as any)},
 {name:'sb-w3',     fn:(t,b)=>sibylEncode(t,ENC,{budgetMs:b,wordGrid:[3]} as any)},
 {name:'sb-w6',     fn:(t,b)=>sibylEncode(t,ENC,{budgetMs:b,wordGrid:[6]} as any)},
 {name:'sb-w12',    fn:(t,b)=>sibylEncode(t,ENC,{budgetMs:b,wordGrid:[12]} as any)},
 {name:'sb-s64',    fn:(t,b)=>sibylEncode(t,ENC,{budgetMs:b,maxSpan:64} as any)},
];
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
function runAll(t:string,b:number){
  const out:Array<[string,number,number]>=[];
  for(const a of ARMS){ const t0=Date.now(); let v=1e9; try{const r=a.fn(t,b); if(r&&r.decoded===t&&typeof r.messageTokens==='number') v=r.messageTokens;}catch{} out.push([a.name,v,Date.now()-t0]); }
  return out;
}
console.log('lane'.padEnd(24),'raw'.padStart(5),'best@60'.padStart(8),'ms60'.padStart(6),'best@4000'.padStart(10),'ms4000'.padStart(7),'top1@60 cost@4000'.padStart(18),'regret'.padStart(7));
let totRegret=0, totMs60=0, totMs4k=0;
for(const [n,t] of files){
  const raw=T(t);
  const t0=Date.now(); const r60=runAll(t,60); const ms60=Date.now()-t0;
  const t1=Date.now(); const r4k=runAll(t,4000); const ms4k=Date.now()-t1;
  const b60=Math.min(...r60.map(x=>x[1])), b4k=Math.min(...r4k.map(x=>x[1]));
  const top1=r60.slice().sort((a,b)=>a[1]-b[1])[0][0];
  const top1At4k=r4k.find(x=>x[0]===top1)![1];
  const regret=Math.min(top1At4k,raw)-Math.min(b4k,raw);
  totRegret+=regret; totMs60+=ms60; totMs4k+=ms4k;
  console.log(n.padEnd(24),String(raw).padStart(5),String(Math.min(b60,raw)).padStart(8),String(ms60).padStart(6),String(Math.min(b4k,raw)).padStart(10),String(ms4k).padStart(7),String(Math.min(top1At4k,raw)).padStart(18),String(regret).padStart(7));
}
console.log(`\nTOTAL regret of ranking 12 arms at 60ms then confirming the top-1 at 4000ms: ${totRegret} tokens`);
console.log(`wall-clock: all-12-at-60ms = ${totMs60}ms   all-12-at-4000ms = ${totMs4k}ms   ratio ${(totMs4k/totMs60).toFixed(1)}x`);
