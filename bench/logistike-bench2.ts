/** Totals-only: METATRON (one draw, shared) vs LOGISTIKE. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, chunkCacheStats, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { logistikeEncode } from '../src/lib/omega/logistike';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const ARMS=Number(process.env.ARMS ?? 4);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
let R=0,M=0,L=0,imp=0,reg=0,flip=0,msM=0,msL=0; const wins:string[]=[];
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  let t0=Date.now(); try{const r=metatronEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  msM+=Date.now()-t0;
  t0=Date.now(); const lg=logistikeEncode(t,ENC,{maxArms:ARMS,armBudgetMs:80,incumbent:inc}); msL+=Date.now()-t0;
  if(lg.decoded!==t) throw new Error('NOT EXACT '+n);
  const l=Math.min(raw,lg.messageTokens);
  R+=raw;M+=m;L+=l; if(l<m){imp++;wins.push(`${n} ${m}->${l}`);} if(l>m)reg++; if(m>=raw&&l<raw)flip++;
}
console.log(`arms=${ARMS} docs=${files.length}`);
console.log(`raw ${R}  METATRON ${M} (${((R-M)/R*100).toFixed(2)}%)  LOGISTIKE ${L} (${((R-L)/R*100).toFixed(2)}%)`);
console.log(`Δ=${M-L} tokens = ${((M-L)/M*100).toFixed(2)}% of the incumbent; improved ${imp}/${files.length}; regressions ${reg}; flipped ${flip}`);
console.log(`wall-clock: metatron ${msM}ms  logistike ${msL}ms`);
console.log('cache', JSON.stringify(chunkCacheStats()));
console.log('wins:', wins.join(' | '));
