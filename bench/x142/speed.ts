/** Run only after other benchmark jobs exit. Both modes run the entire stack.
 * Unmeasured warmup then balanced ABBA/BAAB; caches reset identically per arm.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import * as counter from '../../src/lib/omega/bpe';
const {chunkCacheStats}=counter;
import * as fast from '../../src/lib/omega/bpe-fast';
const setHash=(b:boolean)=>{(fast as unknown as {setRankHash:(v:boolean)=>void}).setRankHash(b);counter.chunkCacheClear();};
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const old=new Map(fs.readFileSync('bench/x141/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>{const a=JSON.parse(l);return[a.path,a.message]}));
for(const path of ['bench/holdout-work/kb-article.txt','bench/holdout-x41/ps-real.txt','bench/holdout-x40/metrics.tsv']){
 const text=fs.readFileSync(path,'utf8');setHash(false);assert.equal(tagstackEncode(text).message,old.get(path));
 for(const [round,order]of ['ABBA','BAAB'].entries())for(const arm of order){
  setHash(arm==='B');const t=performance.now(),r=tagstackEncode(text),ms=performance.now()-t;
  assert.equal(r.message,old.get(path));assert.equal(r.decoded,text);
  console.log(JSON.stringify({path,round,order,arm,ms,tokens:r.messageTokens,sourceExact:true,messageIdentical:true,cache:chunkCacheStats()}));
 }
}
