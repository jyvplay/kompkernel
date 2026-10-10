import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const O200K=/[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n\/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
const memo=new Map<string,number>();
function fast(s:string,enc:EncodingName){ if(s==='')return 0; O200K.lastIndex=0; const cs=s.match(O200K); if(!cs) return countTokens(s,enc);
  let n=0; for(const c of cs){ let v=memo.get(c); if(v===undefined){v=countTokens(c,enc);memo.set(c,v);} n+=v; } return n; }
const docs=['bench/holdout/code-ts.txt','bench/holdout/gh-prose.txt','bench/holdout-mk/page.html','bench/holdout-ops/openstack-loghub-26.log'];
const GL='абвгдежзийклмнопрстуфхцчшщъыэюя';
console.log('=== realistic search workload: 2000 candidate replacements scored per doc ===');
console.log('doc'.padEnd(26),'chars'.padStart(6),'slowMs'.padStart(8),'fastMs'.padStart(8),'speedup'.padStart(8),'agree');
let totSlow=0,totFast=0;
for(const f of docs){
  const t=fs.readFileSync(f,'utf8');
  // build 2000 realistic candidates: repeated substrings of the doc
  const cands:string[]=[];
  for(let i=0;cands.length<2000&&i<t.length-40;i+=Math.max(1,Math.floor(t.length/2600))){
    const len=4+((i*7)%36); const s=t.substr(i,len); if(s.includes(s[0],1)||t.indexOf(s,i+len)>=0) cands.push(s);
  }
  while(cands.length<2000) cands.push(t.substr((cands.length*13)%Math.max(1,t.length-20),8));
  memo.clear(); fast(t,'o200k_base');                  // warm on this doc's chunks
  let agree=true;
  let t0=Date.now(); let acc=0;
  for(let i=0;i<cands.length;i++){ acc+=countTokens(t.split(cands[i]).join(GL[i%GL.length]),'o200k_base'); }
  const slow=Date.now()-t0;
  t0=Date.now(); let acc2=0;
  for(let i=0;i<cands.length;i++){ acc2+=fast(t.split(cands[i]).join(GL[i%GL.length]),'o200k_base'); }
  const fastMs=Date.now()-t0;
  agree = acc===acc2;
  totSlow+=slow; totFast+=fastMs;
  console.log(f.split('/').pop()!.padEnd(26),String(t.length).padStart(6),String(slow).padStart(8),String(fastMs).padStart(8),(slow/Math.max(fastMs,1)).toFixed(1).padStart(8),agree?'EXACT':'DIFFER');
}
console.log(`TOTAL slow=${totSlow}ms fast=${totFast}ms  speedup ${(totSlow/Math.max(totFast,1)).toFixed(1)}x`);
console.log('\n=== cold-cache (first document seen) ===');
for(const f of docs.slice(0,2)){
  const t=fs.readFileSync(f,'utf8');
  memo.clear();
  let t0=Date.now(); for(let i=0;i<200;i++) countTokens(t,'o200k_base'); const a=Date.now()-t0;
  memo.clear();
  t0=Date.now(); for(let i=0;i<200;i++) fast(t,'o200k_base'); const b=Date.now()-t0;
  console.log(f.split('/').pop()!.padEnd(26),'200x whole-doc: slow',String(a).padStart(5)+'ms','fast',String(b).padStart(5)+'ms',(a/Math.max(b,1)).toFixed(1)+'x');
}
