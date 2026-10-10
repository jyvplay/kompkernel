import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { syntomiaEncode } from '../src/lib/omega/syntomia';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for (const d of ['bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-tab'])
  if(fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'SYNT'.padStart(6),'D'.padStart(5),'MTR%'.padStart(6),'SYNT%'.padStart(6),'winner'.padEnd(18),'ms'.padStart(6));
let R=0,M=0,S=0; const wins:string[]=[];
for(const [nm,t] of files){
  const raw=T(t);
  let m=raw; let inc:any=undefined;
  try{const r=metatronEncode(t,ENC,{budgetMs:2500}); if(r.decoded===t){ m=Math.min(raw,r.messageTokens); inc=r; } }catch{}
  const t0=Date.now();
  const s=syntomiaEncode(t,ENC,{budgetMs:2500, incumbent: inc});
  const ms=Date.now()-t0;
  if(s.decoded!==t) throw new Error('NOT EXACT '+nm);
  const sm=Math.min(raw,s.messageTokens);
  R+=raw;M+=m;S+=sm;
  if(sm<m) wins.push(`${nm} ${m}->${sm}`);
  console.log(nm.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(sm).padStart(6),String(m-sm).padStart(5),
    (((raw-m)/raw)*100).toFixed(1).padStart(6),(((raw-sm)/raw)*100).toFixed(1).padStart(6),(s.winner+(s.readmitted?'*':'')).padEnd(18),String(ms).padStart(6));
}
console.log('-'.repeat(100));
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(S).padStart(6),String(M-S).padStart(5),
  (((R-M)/R)*100).toFixed(2).padStart(6),(((R-S)/R)*100).toFixed(2).padStart(6));
console.log(`SYNTOMIA beats METATRON by ${M-S} tokens = ${((M-S)/M*100).toFixed(2)}% of the incumbent output; lanes improved ${wins.length}/${files.length}`);
console.log('wins:', wins.join(' | '));
