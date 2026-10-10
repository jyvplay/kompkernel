/** AKRIBEIA head-to-head. METATRON computed once and handed to both sides. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { eustochiaEncode } from '../src/lib/omega/eustochia';
import { akribeiaEncode } from '../src/lib/omega/akribeia';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const ARMS=Number(process.env.ARMS ?? 3);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log(`arms=${ARMS}  docs=${files.length}`);
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'EUST'.padStart(6),'AKR'.padStart(6),'DvM'.padStart(5),'MTR%'.padStart(6),'AKR%'.padStart(6),'winner'.padEnd(14),'ms'.padStart(6));
let R=0,M=0,E=0,A=0,imp=0,flip=0,reg=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t){m=Math.min(raw,r.messageTokens); inc=r;}}catch{}
  let e=raw; try{const r=eustochiaEncode(t,ENC,{maxArms:2,armBudgetMs:80,incumbent:inc}); if(r.decoded===t) e=Math.min(raw,r.messageTokens);}catch{}
  const t0=Date.now();
  const a=akribeiaEncode(t,ENC,{maxArms:ARMS,armBudgetMs:80,incumbent:inc});
  const ms=Date.now()-t0;
  if(a.decoded!==t) throw new Error('NOT EXACT '+n);
  const am=Math.min(raw,a.messageTokens);
  R+=raw;M+=m;E+=e;A+=am;
  if(am<m){imp++;wins.push(`${n} ${m}->${am}`);} if(am>m) reg++;
  if(m>=raw&&am<raw) flip++;
  console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(e).padStart(6),String(am).padStart(6),String(m-am).padStart(5),
    (((raw-m)/raw)*100).toFixed(1).padStart(6),(((raw-am)/raw)*100).toFixed(1).padStart(6),a.winner.padEnd(14),String(ms).padStart(6));
}
console.log('-'.repeat(112));
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(E).padStart(6),String(A).padStart(6),String(M-A).padStart(5),
  (((R-M)/R)*100).toFixed(2).padStart(6),(((R-A)/R)*100).toFixed(2).padStart(6));
console.log(`AKRIBEIA vs METATRON: ${M-A} tokens = ${((M-A)/M*100).toFixed(2)}% of the incumbent output; improved ${imp}/${files.length}; regressions ${reg}; flipped from 0% ${flip}`);
console.log(`AKRIBEIA vs EUSTOCHIA: ${E-A} tokens = ${((E-A)/E*100).toFixed(2)}%`);
console.log('wins:', wins.join(' | '));
