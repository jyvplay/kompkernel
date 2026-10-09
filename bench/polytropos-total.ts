import fs from 'node:fs'; import path from 'node:path';
import { countTokens, chunkCacheStats, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { polytroposEncode } from '../src/lib/omega/polytropos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
let R=0,M=0,P=0,imp=0,reg=0,flip=0,msM=0,msP=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  let t0=Date.now(); try{const r=metatronEncode(t,ENC,{budgetMs:1500}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  msM+=Date.now()-t0;
  t0=Date.now(); const pt=polytroposEncode(t,ENC,{maxConfigs:5,configBudgetMs:70,incumbent:inc}); msP+=Date.now()-t0;
  if(pt.decoded!==t) throw new Error('NOT EXACT '+n);
  const p=Math.min(raw,pt.messageTokens);
  R+=raw;M+=m;P+=p; if(p<m){imp++;wins.push(`${n} ${m}->${p}`);} if(p>m)reg++; if(m>=raw&&p<raw)flip++;
}
console.log(`docs=${files.length}`);
console.log(`raw ${R}  METATRON ${M} (${((R-M)/R*100).toFixed(2)}%)  POLYTROPOS ${P} (${((R-P)/R*100).toFixed(2)}%)`);
console.log(`Δ=${M-P} tok = ${((M-P)/M*100).toFixed(2)}% of the incumbent; improved ${imp}/${files.length}; regressions ${reg}; flipped ${flip}`);
console.log(`wall-clock metatron ${msM}ms  polytropos ${msP}ms`);
console.log('cache', JSON.stringify(chunkCacheStats()));
console.log('wins:', wins.join(' | '));
