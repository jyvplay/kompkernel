import fs from 'node:fs'; import path from 'node:path';
import { countTokens, tokenStrings, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { metatronEncode } from '../src/lib/omega/metatron';
import { synizesisEncode } from '../src/lib/omega/synizesis';
const ENC: EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files = fs.readdirSync('bench/holdout-work').sort().map(f=>[f, fs.readFileSync(path.join('bench/holdout-work',f),'utf8')] as [string,string]);

console.log('=== incumbent frontier on the "everyday work" lanes ===');
console.log('lane'.padEnd(24),'raw'.padStart(6),'DAED'.padStart(6),'MTR'.padStart(6),'SYN'.padStart(6),'best%'.padStart(7));
for (const [n,t] of files) {
  const raw=T(t);
  let d=raw,m=raw,s=raw;
  try{const r=daedalusEncode(t,ENC,{budgetMs:4000}); if(r.decoded===t) d=Math.min(raw,r.messageTokens);}catch{}
  try{const r=metatronEncode(t,ENC,{budgetMs:4000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  try{const r=synizesisEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t) s=Math.min(raw,r.messageTokens);}catch{}
  const b=Math.min(d,m,s);
  console.log(n.padEnd(24),String(raw).padStart(6),String(d).padStart(6),String(m).padStart(6),String(s).padStart(6),(((raw-b)/raw)*100).toFixed(1).padStart(7));
}

console.log('\n=== token-class composition (where do the tokens actually go?) ===');
console.log('lane'.padEnd(24),'tok'.padStart(6),'wordTok%'.padStart(9),'punctTok%'.padStart(10),'wsTok%'.padStart(8),'numTok%'.padStart(8),'avgChars'.padStart(9));
const extra: Array<[string,string]> = [...files];
for (const f of ['gh-prose.txt','license.txt','readme.txt','md-vite.txt']) extra.push(['ho/'+f, fs.readFileSync('bench/holdout/'+f,'utf8')]);
for (const [n,t] of extra) {
  const ts = tokenStrings(t, ENC);
  let w=0,p=0,ws=0,nu=0;
  for (const s of ts) {
    if (/^\s+$/.test(s)) ws++;
    else if (/\p{L}/u.test(s)) w++;
    else if (/\p{N}/u.test(s)) nu++;
    else p++;
  }
  const tot=ts.length;
  console.log(n.padEnd(24),String(tot).padStart(6),(100*w/tot).toFixed(1).padStart(9),(100*p/tot).toFixed(1).padStart(10),(100*ws/tot).toFixed(1).padStart(8),(100*nu/tot).toFixed(1).padStart(8),(t.length/tot).toFixed(2).padStart(9));
}

console.log('\n=== markdown-markup tax ===');
const md = fs.readFileSync('bench/holdout-work/llm-answer.md','utf8');
const strip = (s:string)=>s.replace(/\*\*/g,'');
console.log('llm-answer.md raw', T(md), ' without ** ', T(strip(md)), ' delta', T(md)-T(strip(md)));
const tests = ['**Webpack 4**','**85%**','**-85.7%**','`packages/web`','| Cold start | 42.8 s | 6.1 s | **-85.7%** |','### 1. What actually changed','- [ ] Migrate `packages/admin` (1 day)'];
for (const x of tests) console.log(String(T(x)).padStart(3), JSON.stringify(x), '| plain:', T(x.replace(/[*`|\[\]]/g,'')));
