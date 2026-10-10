import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { panoptesEncode } from '../src/lib/omega/panoptes';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { ariadneEncode } from '../src/lib/omega/ariadne';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for (const d of ['bench/holdout-work','bench/holdout'])
  for (const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTRmsg'.padStart(7),'MTRwire'.padStart(8),'MTRctr'.padStart(7),'SIBwire'.padStart(8),'SIBctr'.padStart(7),'winner');
let ctrSum=0,n=0;
for(const [nm,t] of files){
  const raw=T(t);
  let m:any=null; try{m=metatronEncode(t,ENC,{budgetMs:3000});}catch{}
  let s:any=null; try{s=sibylEncode(t,ENC,{budgetMs:3000});}catch{}
  const mw=m?T(m.wire):0, mc=m?m.messageTokens-mw:0;
  const sw=s?T(s.wire):0, sc=s?s.messageTokens-sw:0;
  if(m&&m.decoded===t&&m.messageTokens<raw){ctrSum+=mc;n++;}
  console.log(nm.padEnd(26),String(raw).padStart(6),String(m?m.messageTokens:-1).padStart(7),String(mw).padStart(8),String(mc).padStart(7),String(sw).padStart(8),String(sc).padStart(7),(m?.winner??'')+'');
}
console.log(`\nmean METATRON contract on engaged lanes: ${(ctrSum/Math.max(1,n)).toFixed(1)} tokens over ${n} lanes`);
