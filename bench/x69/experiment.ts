import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { diorthosiEncode,diorthosiPlan,diorthosiDecode } from '../../src/lib/omega/diorthosi';
import { countTokens } from '../../src/lib/omega/bpe';
const base=readFileSync('bench/holdout-work/kb-article.txt','utf8').split('\n');
// Artificial version history of an existing document, not an independent real-world dataset.
const docs=Array.from({length:8},(_,i)=>{const x=base.slice(); if(i) x[1]=`Revision ${i}: incident follow-up owner and schedule.`; return x.join('\n')});
const text=docs.join('\n---\n'); const t=performance.now(); const r=diorthosiEncode(text); const ms=performance.now()-t;
const o={fixture:'synthetic eight revisions of bench/holdout-work/kb-article.txt',sourceSha256:createHash('sha256').update(text).digest('hex'),sourceChars:text.length, rawTokens:countTokens(text,'o200k_base'),...r, message:undefined,decoded:undefined, messageSha256:createHash('sha256').update(r.message).digest('hex'), measuredMs:ms};
writeFileSync('bench/x69/experiment-receipt.json',JSON.stringify(o,null,2)+'\n'); console.log(JSON.stringify(o,null,2));
if(!r.exact || r.decoded!==text || diorthosiDecode(diorthosiPlan(text)!)!==text) process.exitCode=1;
