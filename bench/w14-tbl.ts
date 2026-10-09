import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { synizesisEncode } from '../src/lib/omega/synizesis';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files=fs.readdirSync('bench/holdout-tbl').sort().map(f=>[f,fs.readFileSync(path.join('bench/holdout-tbl',f),'utf8')] as [string,string]);
console.log('lane'.padEnd(24),'raw'.padStart(6),'MTR'.padStart(6),'SYN'.padStart(6),'best%'.padStart(7),'chars/tok'.padStart(10));
for(const [n,t] of files){
  const raw=T(t);
  let m=raw,s=raw;
  try{const r=metatronEncode(t,ENC,{budgetMs:4000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  try{const r=synizesisEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t) s=Math.min(raw,r.messageTokens);}catch{}
  const b=Math.min(m,s);
  console.log(n.padEnd(24),String(raw).padStart(6),String(m).padStart(6),String(s).padStart(6),(((raw-b)/raw)*100).toFixed(1).padStart(7),(t.length/raw).toFixed(2).padStart(10));
}
