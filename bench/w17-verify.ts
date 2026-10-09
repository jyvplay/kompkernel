import fs from 'node:fs'; import path from 'node:path';
import { countTokens, countTokensExact, verifyChunkAlgebra, chunkCacheStats, chunkCacheClear, type EncodingName } from '../src/lib/omega/bpe';
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()) files.push([d.split('/').pop()!+'/'+f, fs.readFileSync(path.join(d,f),'utf8')]);
let bad=0;
for(const enc of ['o200k_base','cl100k_base'] as EncodingName[]) for(const [n,t] of files)
  if(!verifyChunkAlgebra(t,enc)){bad++;console.log('  MISMATCH',enc,n,countTokens(t,enc),'vs',countTokensExact(t,enc));}
console.log(`documents: ${files.length*2-bad}/${files.length*2} exact`);
// adversarial + fuzz
let seed=0xFACE01; const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
const atoms=['the ','ドキュメント','文档','документ ','§','¶','×','…','\n','\r\n','  ','    ','123','0',' ','abc','ABC','é','💡','👨‍👩‍👧‍👦','\t','-','.',',','|','#','**','```','','ไทย','नम','한글','ع','</div>','$\\alpha$',"don't","IT'S","McDonald's",'\u0000','\u0301','e\u0301','ß','İ','ǅ','  \n  ','\r','a'.repeat(300)];
let ff=0;
for(let i=0;i<30000;i++){ let t=''; const k=1+Math.floor(rnd()*14); for(let j=0;j<k;j++) t+=atoms[Math.floor(rnd()*atoms.length)];
  for(const enc of ['o200k_base','cl100k_base'] as EncodingName[]) if(countTokens(t,enc)!==countTokensExact(t,enc)){ff++; if(ff<5) console.log('  FUZZ MISMATCH',enc,JSON.stringify(t.slice(0,90)));} }
console.log(`fuzz: 30000 random strings x 2 encodings, ${ff} mismatches`);
// speed
chunkCacheClear();
const big=files.filter(([,t])=>t.length>2000).slice(0,10);
let t0=Date.now(); for(let r=0;r<30;r++) for(const [,t] of big) countTokensExact(t,'o200k_base'); const slow=Date.now()-t0;
chunkCacheClear();
t0=Date.now(); for(let r=0;r<30;r++) for(const [,t] of big) countTokens(t,'o200k_base'); const fast=Date.now()-t0;
console.log(`speed on ${big.length} docs x30: exact=${slow}ms accelerated=${fast}ms  speedup ${(slow/Math.max(fast,1)).toFixed(2)}x`);
console.log('cache', JSON.stringify(chunkCacheStats()));
if(bad||ff) process.exit(1);
