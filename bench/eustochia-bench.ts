/** EUSTOCHIA head-to-head. METATRON computed once and handed to both sides so
 *  the comparison is a single draw of its non-deterministic search. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { eustochiaEncode } from '../src/lib/omega/eustochia';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const MAXARMS=Number(process.env.ARMS ?? 2);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log(`arms=${MAXARMS}`);
console.log('lane'.padEnd(28),'raw'.padStart(6),'MTR'.padStart(6),'EUST'.padStart(6),'D'.padStart(5),'MTR%'.padStart(6),'EUST%'.padStart(6),'winner'.padEnd(12),'ms'.padStart(6));
let R=0,M=0,E=0,imp=0,flip=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t){m=Math.min(raw,r.messageTokens); inc=r;}}catch{}
  const t0=Date.now();
  const e=eustochiaEncode(t,ENC,{maxArms:MAXARMS,armBudgetMs:80,incumbent:inc});
  const ms=Date.now()-t0;
  if(e.decoded!==t) throw new Error('NOT EXACT '+n);
  const em=Math.min(raw,e.messageTokens);
  R+=raw;M+=m;E+=em; if(em<m){imp++;wins.push(`${n} ${m}->${em}`);} if(m>=raw&&em<raw) flip++;
  console.log(n.padEnd(28),String(raw).padStart(6),String(m).padStart(6),String(em).padStart(6),String(m-em).padStart(5),
    (((raw-m)/raw)*100).toFixed(1).padStart(6),(((raw-em)/raw)*100).toFixed(1).padStart(6),e.winner.padEnd(12),String(ms).padStart(6));
}
console.log('-'.repeat(104));
console.log('TOTAL'.padEnd(28),String(R).padStart(6),String(M).padStart(6),String(E).padStart(6),String(M-E).padStart(5),
  (((R-M)/R)*100).toFixed(2).padStart(6),(((R-E)/R)*100).toFixed(2).padStart(6));
console.log(`EUSTOCHIA beats METATRON by ${M-E} tokens = ${((M-E)/M*100).toFixed(2)}% of the incumbent output; improved ${imp}/${files.length}; flipped from 0% ${flip}`);
console.log('wins:', wins.join(' | '));
