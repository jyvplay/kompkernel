import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { panoptesEncode } from '../src/lib/omega/panoptes';
import { sequoyahEncode } from '../src/lib/omega/sequoyah';
import { thothEncode } from '../src/lib/omega/thoth';
import { palimpsestEncode } from '../src/lib/omega/palimpsest';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const B=4000;
const subs: Array<[string,(t:string)=>any]> = [
  ['ariadne', t=>ariadneEncode(t,ENC,{budgetMs:B})],
  ['sibyl',   t=>sibylEncode(t,ENC,{budgetMs:B})],
  ['daedalus',t=>daedalusEncode(t,ENC,{budgetMs:B})],
  ['episteme',t=>epistemeEncode(t,ENC,{budgetMs:B} as any)],
  ['panoptes',t=>panoptesEncode(t,ENC,{budgetMs:B} as any)],
  ['sequoyah',t=>sequoyahEncode(t,ENC,{budgetMs:B} as any)],
  ['thoth',   t=>thothEncode(t,ENC,{budgetMs:B} as any)],
  ['palimpsest',t=>palimpsestEncode(t,ENC,{budgetMs:B} as any)],
  // more arms of the same two engines, which DAEDALUS caps at 2
  ['ariadne-w1', t=>sibylEncode(t,ENC,{budgetMs:B, wordGrid:[1]} as any)],
  ['ariadne-w3', t=>sibylEncode(t,ENC,{budgetMs:B, wordGrid:[3]} as any)],
  ['ariadne-w6', t=>sibylEncode(t,ENC,{budgetMs:B, wordGrid:[6]} as any)],
  ['ariadne-nb', t=>ariadneEncode(t,ENC,{budgetMs:B, noBlocks:true} as any)],
  ['ariadne-s16',t=>ariadneEncode(t,ENC,{budgetMs:B, maxSpan:16} as any)],
  ['ariadne-s64',t=>ariadneEncode(t,ENC,{budgetMs:B, maxSpan:64} as any)],
  ['ariadne-L4', t=>ariadneEncode(t,ENC,{budgetMs:B, levels:4} as any)],
  ['ariadne-K64',t=>ariadneEncode(t,ENC,{budgetMs:B, topK:64} as any)],
];
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'bestArm'.padStart(7),'Δ'.padStart(5),'Δ%'.padStart(6),'which');
let R=0,M=0,BA=0;
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:B}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  let best=raw, who='identity';
  for(const [nm,fn] of subs){
    try{ const r=fn(t); if(r && r.decoded===t && typeof r.messageTokens==='number' && r.messageTokens<best){best=r.messageTokens;who=nm;} }catch{}
  }
  R+=raw;M+=m;BA+=Math.min(m,best);
  console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(best).padStart(7),String(m-Math.min(m,best)).padStart(5),(((m-Math.min(m,best))/m)*100).toFixed(1).padStart(6),who);
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(BA).padStart(7),String(M-BA).padStart(5),(((M-BA)/M)*100).toFixed(2).padStart(6));
