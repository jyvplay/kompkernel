import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { syntomiaEncode, syntomiaSearch, syntomiaContract } from '../src/lib/omega/syntomia';
import { chironDecode } from '../src/lib/omega/chiron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for(const f of fs.readdirSync('bench/holdout-lang').sort()) files.push(['lang/'+f, fs.readFileSync(path.join('bench/holdout-lang',f),'utf8')]);
files.push(['work/kb-article.txt(EN)', fs.readFileSync('bench/holdout-work/kb-article.txt','utf8')]);
console.log('lane'.padEnd(26),'chars'.padStart(6),'raw'.padStart(5),'c/t'.padStart(5),'MTR'.padStart(5),'MTR%'.padStart(6),'SYNT'.padStart(5),'SYNT%'.padStart(6),'subword'.padStart(8),'sw%'.padStart(6),'rules'.padStart(6));
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:4000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  let sy=raw; try{const r=syntomiaEncode(t,ENC,{budgetMs:4000}); if(r.decoded===t) sy=Math.min(raw,r.messageTokens);}catch{}
  // sub-word exact-measurement dictionary (arbitrary substrings, incl. stems)
  let sw=raw, rules=0;
  for(const script of ['cyrillic','polyglot','cjk','katakana','hangul']){
    try{
      const o=syntomiaSearch(t,ENC,{budgetMs:3000,maxRules:200,topK:150,scriptName:script});
      if(o && chironDecode(o.wire)===t){ const c=syntomiaContract(o.wire,t); const tok=T(o.wire)+T(c); if(tok<sw){sw=tok;rules=o.rules;} }
    }catch{}
  }
  console.log(n.padEnd(26),String(t.length).padStart(6),String(raw).padStart(5),(t.length/raw).toFixed(2).padStart(5),
    String(m).padStart(5),(((raw-m)/raw)*100).toFixed(1).padStart(6),
    String(sy).padStart(5),(((raw-sy)/raw)*100).toFixed(1).padStart(6),
    String(sw).padStart(8),(((raw-sw)/raw)*100).toFixed(1).padStart(6),String(rules).padStart(6));
}
