// Differential lookup test on real source prefixes. This tests exact anchor
// selection, not an independent proof that arbitrary mark positions are resumable.
import fs from 'node:fs';import assert from 'node:assert/strict';import {prolepsisReset,prolepsisRecord,prolepsisLookup} from '../../src/lib/omega/prolepsis';import {tokenTail,countTokensExact,countTokens} from '../../src/lib/omega/bpe';let checks=0;const rows:any[]=[];
for(const enc of ['o200k_base','cl100k_base'] as const)for(const path of ['bench/holdout-work/kb-article.txt','bench/x159/fixtures/http-toc.txt']){
 const text=fs.readFileSync(path,'utf8');prolepsisReset();const marks=[];for(let p=256;p<text.length;p+=256){const pre=text.slice(0,p),t=tokenTail(pre,enc)!;marks.push({pos:p,total:countTokensExact(pre,enc),tail:t.tail,tailTok:t.tailTok});}prolepsisRecord(text,enc,marks);
 for(const q of [0,63,64,127,128,191,192,254,255,256,257,511,512,text.length-1])for(const edit of ['X','\n','😀']){
  const changed=text.slice(0,q)+edit+text.slice(q+1),m=prolepsisLookup(changed,enc);rows.push({enc,path,q,edit,mark:m});checks++;
 }
 // Real full counter calls also exercise recorded anchors from actual traversal.
 for(let i=0;i<20;i++){const changed=text.slice(0,1024)+String(i)+text.slice(1024);assert.equal(countTokens(changed,enc),countTokensExact(changed,enc));checks++;}
}
console.log(JSON.stringify({checks,rows}));
