/** LOGISTIKE head-to-head on BOTH axes: tokens and wall-clock. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { akribeiaEncode } from '../src/lib/omega/akribeia';
import { logistikeEncode } from '../src/lib/omega/logistike';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const ARMS=Number(process.env.ARMS ?? 6);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log(`arms=${ARMS} docs=${files.length}`);
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'AKR'.padStart(6),'LOG'.padStart(6),'DvM'.padStart(5),'MTR%'.padStart(6),'LOG%'.padStart(6),'akrMs'.padStart(6),'logMs'.padStart(6),'winner');
let R=0,M=0,A=0,L=0,imp=0,reg=0,flip=0,msA=0,msL=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  let t0=Date.now(); const ak=akribeiaEncode(t,ENC,{maxArms:3,armBudgetMs:80,incumbent:inc}); const aMs=Date.now()-t0;
  t0=Date.now(); const lg=logistikeEncode(t,ENC,{maxArms:ARMS,armBudgetMs:80,incumbent:inc}); const lMs=Date.now()-t0;
  if(lg.decoded!==t) throw new Error('NOT EXACT '+n);
  if(!lg.algebraExact) console.log('   (algebra fell back on '+n+')');
  const a=Math.min(raw,ak.messageTokens), l=Math.min(raw,lg.messageTokens);
  R+=raw;M+=m;A+=a;L+=l;msA+=aMs;msL+=lMs;
  if(l<m){imp++;wins.push(`${n} ${m}->${l}`);} if(l>m) reg++; if(m>=raw&&l<raw) flip++;
  console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(a).padStart(6),String(l).padStart(6),String(m-l).padStart(5),
    (((raw-m)/raw)*100).toFixed(1).padStart(6),(((raw-l)/raw)*100).toFixed(1).padStart(6),String(aMs).padStart(6),String(lMs).padStart(6),lg.winner);
}
console.log('-'.repeat(120));
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(A).padStart(6),String(L).padStart(6),String(M-L).padStart(5),
  (((R-M)/R)*100).toFixed(2).padStart(6),(((R-L)/R)*100).toFixed(2).padStart(6),String(msA).padStart(6),String(msL).padStart(6));
console.log(`LOGISTIKE vs METATRON: ${M-L} tokens = ${((M-L)/M*100).toFixed(2)}%; improved ${imp}/${files.length}; regressions ${reg}; flipped ${flip}`);
console.log(`LOGISTIKE vs AKRIBEIA: ${A-L} tokens = ${((A-L)/A*100).toFixed(2)}%   wall-clock akr=${msA}ms log=${msL}ms`);
console.log('wins:', wins.join(' | '));
