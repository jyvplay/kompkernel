import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { plinthosEncode } from '../src/lib/omega/plinthos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
let R=0,M=0,P=0,imp=0,reg=0,flip=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:700}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  const pl=plinthosEncode(t,ENC,{maxConfigs:2,configBudgetMs:45,incumbent:inc});
  if(pl.decoded!==t) throw new Error('NOT EXACT '+n);
  const p=Math.min(raw,pl.messageTokens);
  R+=raw;M+=m;P+=p; if(p<m){imp++;wins.push(`${n} ${m}->${p}`);} if(p>m)reg++; if(m>=raw&&p<raw)flip++;
  console.log(`${n.padEnd(26)} raw ${String(raw).padStart(5)} MTR ${String(m).padStart(5)} PLI ${String(p).padStart(5)} d ${String(m-p).padStart(4)} ${pl.winner}${pl.transposed?' ['+pl.blocks+'blk]':''}`);
}
console.log('-'.repeat(90));
console.log(`docs=${files.length}  raw ${R}  METATRON ${M} (${((R-M)/R*100).toFixed(2)}%)  PLINTHOS ${P} (${((R-P)/R*100).toFixed(2)}%)`);
console.log(`Δ=${M-P} tok = ${((M-P)/M*100).toFixed(2)}%; improved ${imp}/${files.length}; regressions ${reg}; flipped ${flip}`);
console.log('wins:', wins.join(' | '));
