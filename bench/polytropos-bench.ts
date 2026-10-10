/** POLYTROPOS vs METATRON and LOGISTIKE. METATRON computed once, shared. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, chunkCacheStats, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { logistikeEncode } from '../src/lib/omega/logistike';
import { polytroposEncode } from '../src/lib/omega/polytropos';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const CFG=Number(process.env.CFG ?? 6);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<16000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
let R=0,M=0,L=0,P=0,imp=0,reg=0,flip=0,msL=0,msP=0; const wins:string[]=[]; 
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:1500}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  let t0=Date.now(); const lg=logistikeEncode(t,ENC,{maxArms:4,armBudgetMs:80,incumbent:inc}); msL+=Date.now()-t0;
  t0=Date.now(); const pt=polytroposEncode(t,ENC,{maxConfigs:CFG,configBudgetMs:80,incumbent:inc}); msP+=Date.now()-t0;
  if(pt.decoded!==t) throw new Error('NOT EXACT '+n);
  const l=Math.min(raw,lg.messageTokens), p=Math.min(raw,pt.messageTokens);
  R+=raw;M+=m;L+=l;P+=p;
  if(p<m){imp++;wins.push(`${n} ${m}->${p}`);} if(p>m) reg++; if(m>=raw&&p<raw) flip++;
  console.log(`${n.padEnd(26)} raw ${String(raw).padStart(5)} MTR ${String(m).padStart(5)} LOG ${String(l).padStart(5)} POLY ${String(p).padStart(5)} d ${String(m-p).padStart(4)} ${pt.winner}`);
}
console.log('-'.repeat(96));
console.log(`configs=${CFG} docs=${files.length}`);
console.log(`raw ${R}  METATRON ${M} (${((R-M)/R*100).toFixed(2)}%)  LOGISTIKE ${L} (${((R-L)/R*100).toFixed(2)}%)  POLYTROPOS ${P} (${((R-P)/R*100).toFixed(2)}%)`);
console.log(`POLY vs METATRON: ${M-P} tok = ${((M-P)/M*100).toFixed(2)}%; improved ${imp}/${files.length}; regressions ${reg}; flipped ${flip}`);
console.log(`POLY vs LOGISTIKE: ${L-P} tok = ${((L-P)/L*100).toFixed(2)}%   wall-clock log=${msL}ms poly=${msP}ms`);
console.log('cache', JSON.stringify(chunkCacheStats()));
console.log('wins:', wins.join(' | '));
