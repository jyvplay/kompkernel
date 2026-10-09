import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { plinthosEncode } from '../src/lib/omega/plinthos';
import { anastropheEncode } from '../src/lib/omega/anastrophe';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab','bench/holdout-ops'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>80&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
let R=0,M=0,P=0,A=0,msP=0,msA=0,imp=0,reg=0,adm=0;
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:700}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  let t0=Date.now(); const pl=plinthosEncode(t,ENC,{maxConfigs:3,configBudgetMs:55,incumbent:inc}); msP+=Date.now()-t0;
  t0=Date.now(); const an=anastropheEncode(t,ENC,{maxConfigs:3,configBudgetMs:55,armBudgetMs:3000,incumbent:inc}); msA+=Date.now()-t0;
  if(an.decoded!==t) throw new Error('NOT EXACT '+n);
  const p=Math.min(raw,pl.messageTokens), a=Math.min(raw,an.messageTokens);
  R+=raw;M+=m;P+=p;A+=a; if(a<m)imp++; if(a>m)reg++; if(an.gate.admitted)adm++;
  console.log(`${n.padEnd(26)} raw ${String(raw).padStart(5)} MTR ${String(m).padStart(5)} PLI ${String(p).padStart(5)} ANA ${String(a).padStart(5)} d ${String(m-a).padStart(4)} gate=${an.gate.admitted?'Y':'n'} ${an.winner}`);
}
console.log('-'.repeat(96));
console.log(`docs=${files.length}  raw ${R}  METATRON ${M} (${((R-M)/R*100).toFixed(2)}%)  PLINTHOS ${P}  ANASTROPHE ${A} (${((R-A)/R*100).toFixed(2)}%)`);
console.log(`ANA vs METATRON: ${M-A} tok = ${((M-A)/M*100).toFixed(2)}%; improved ${imp}/${files.length}; regressions ${reg}; gate admitted ${adm}/${files.length}`);
console.log(`wall-clock: plinthos ${msP}ms  anastrophe ${msA}ms  (${(msP/Math.max(msA,1)).toFixed(2)}x)`);
