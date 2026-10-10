import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { polytroposEncode } from '../src/lib/omega/polytropos';
import { kionesEncode } from '../src/lib/omega/kiones';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
let R=0,M=0,P=0,K=0,imp=0,reg=0,flip=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:1500}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  const pt=polytroposEncode(t,ENC,{maxConfigs:5,configBudgetMs:70,incumbent:inc});
  const kn=kionesEncode(t,ENC,{maxConfigs:5,configBudgetMs:70,incumbent:inc});
  if(kn.decoded!==t) throw new Error('NOT EXACT '+n);
  const p=Math.min(raw,pt.messageTokens), k=Math.min(raw,kn.messageTokens);
  R+=raw;M+=m;P+=p;K+=k;
  if(k<m){imp++;wins.push(`${n} ${m}->${k}`);} if(k>m)reg++; if(m>=raw&&k<raw)flip++;
  if(k<p) console.log(`${n.padEnd(26)} raw ${String(raw).padStart(5)} MTR ${String(m).padStart(5)} POLY ${String(p).padStart(5)} KION ${String(k).padStart(5)}  d ${String(p-k).padStart(4)}  ${kn.notes}`);
}
console.log('-'.repeat(96));
console.log(`docs=${files.length}`);
console.log(`raw ${R}  METATRON ${M} (${((R-M)/R*100).toFixed(2)}%)  POLYTROPOS ${P} (${((R-P)/R*100).toFixed(2)}%)  KIONES ${K} (${((R-K)/R*100).toFixed(2)}%)`);
console.log(`KIONES vs METATRON: ${M-K} tok = ${((M-K)/M*100).toFixed(2)}%; improved ${imp}/${files.length}; regressions ${reg}; flipped ${flip}`);
console.log(`KIONES vs POLYTROPOS: ${P-K} tok = ${((P-K)/P*100).toFixed(2)}%`);
console.log('wins:', wins.join(' | '));
