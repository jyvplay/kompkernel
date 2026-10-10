import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { eustochiaEncode } from '../src/lib/omega/eustochia';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files=fs.readdirSync('bench/holdout-mk').sort().map(f=>[f,fs.readFileSync(path.join('bench/holdout-mk',f),'utf8')] as [string,string]);
console.log('lane'.padEnd(22),'chars'.padStart(6),'raw'.padStart(6),'c/t'.padStart(5),'MTR'.padStart(6),'MTR%'.padStart(6),'EUST'.padStart(6),'EUST%'.padStart(6));
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:4000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  let e=raw; try{const r=eustochiaEncode(t,ENC,{maxArms:3,armBudgetMs:80}); if(r.decoded===t) e=Math.min(raw,r.messageTokens);}catch{}
  console.log(n.padEnd(22),String(t.length).padStart(6),String(raw).padStart(6),(t.length/raw).toFixed(2).padStart(5),
    String(m).padStart(6),(((raw-m)/raw)*100).toFixed(1).padStart(6),String(e).padStart(6),(((raw-e)/raw)*100).toFixed(1).padStart(6));
}
console.log('\n=== closing-tag / structural-delimiter census ===');
for(const [n,t] of files){
  const close=[...t.matchAll(/<\/[A-Za-z][A-Za-z0-9-]*>/g)].map(m=>m[0]);
  const open=[...t.matchAll(/<[A-Za-z][A-Za-z0-9-]*(\s[^>]*)?>/g)].length;
  if(!close.length) continue;
  const closeTok=close.reduce((s,c)=>s+T(c),0);
  const distinct=new Set(close).size;
  console.log(n.padEnd(22),'open',String(open).padStart(4),'close',String(close.length).padStart(4),'distinct',String(distinct).padStart(3),
    'closeTokens',String(closeTok).padStart(5),`(${(100*closeTok/T(t)).toFixed(1)}% of doc)`, 'avg',(closeTok/close.length).toFixed(2));
}
