import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { diorthosiEncode } from '../../src/lib/omega/diorthosi';
import { countTokens } from '../../src/lib/omega/bpe';
const base=readFileSync('bench/holdout-work/kb-article.txt','utf8').split('\n');
// Stress case: a synthetic version history with a different edit on every nonempty line.
const docs=Array.from({length:8},(_,i)=>base.map(line=>i && line.length>20 ? line.slice(0,15)+` [rev${i}] `+line.slice(15) : line).join('\n'));
const text=docs.join('\n---\n'); const t=performance.now(); const r=diorthosiEncode(text); const ms=performance.now()-t;
const o={fixture:'synthetic eight heavily edited revisions of bench/holdout-work/kb-article.txt',sourceSha256:createHash('sha256').update(text).digest('hex'),sourceChars:text.length,rawTokens:countTokens(text,'o200k_base'),...r,message:undefined,decoded:undefined,messageSha256:createHash('sha256').update(r.message).digest('hex'),measuredMs:ms};
writeFileSync('bench/x69/experiment2-receipt.json',JSON.stringify(o,null,2)+'\n'); console.log(JSON.stringify(o,null,2));
if(!r.exact || r.decoded!==text) process.exitCode=1;
