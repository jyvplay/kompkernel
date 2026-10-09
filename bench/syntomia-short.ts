/** The real everyday case: SHORT chat-sized messages, where a 40-token
 *  contract is a larger constant than the entire achievable wire gain. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { syntomiaEncode } from '../src/lib/omega/syntomia';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
// slice real documents into chat-sized excerpts (200-700 tokens)
const srcs:Array<[string,string]>=[];
for(const d of ['bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  for(const f of fs.readdirSync(d).sort()) srcs.push([d.split('/').pop()!.replace('holdout-','')+'/'+f, fs.readFileSync(path.join(d,f),'utf8')]);
const cases:Array<[string,string]>=[];
for(const [n,t] of srcs){
  const lines=t.split('\n');
  for(const frac of [0.33,0.66]){
    const a=Math.floor(lines.length*frac*0.5), b=Math.min(lines.length, a+Math.max(6,Math.floor(lines.length*0.35)));
    const ex=lines.slice(a,b).join('\n');
    const tk=T(ex);
    if(tk>=150 && tk<=800) cases.push([`${n}#${frac}`, ex]);
  }
}
console.log(`${cases.length} chat-sized excerpts (150-800 tokens)`);
console.log('lane'.padEnd(30),'raw'.padStart(5),'MTR'.padStart(5),'SYNT'.padStart(5),'D'.padStart(4),'MTR%'.padStart(6),'SYNT%'.padStart(6),'winner');
let R=0,M=0,S=0,flips=0,improved=0;
for(const [n,t] of cases){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:1500}); if(r.decoded===t){m=Math.min(raw,r.messageTokens); inc=r;}}catch{}
  const s=syntomiaEncode(t,ENC,{budgetMs:1500, incumbent: inc});
  if(s.decoded!==t) throw new Error('NOT EXACT '+n);
  const sm=Math.min(raw,s.messageTokens);
  R+=raw;M+=m;S+=sm; if(sm<m) improved++; if(m>=raw && sm<raw) flips++;
  console.log(n.padEnd(30),String(raw).padStart(5),String(m).padStart(5),String(sm).padStart(5),String(m-sm).padStart(4),
    (((raw-m)/raw)*100).toFixed(1).padStart(6),(((raw-sm)/raw)*100).toFixed(1).padStart(6),s.winner+(s.readmitted?'*':''));
}
console.log('-'.repeat(96));
console.log(`TOTAL raw=${R} METATRON=${M} (${((R-M)/R*100).toFixed(2)}%) SYNTOMIA=${S} (${((R-S)/R*100).toFixed(2)}%)`);
console.log(`Δ=${M-S} tokens = ${((M-S)/M*100).toFixed(2)}% of the incumbent; improved ${improved}/${cases.length}; lanes flipped from 0% ${flips}`);
