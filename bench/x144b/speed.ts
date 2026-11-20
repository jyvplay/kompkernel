/** Execute only after frontier/parent jobs exit. Whole-stack ABBA/BAAB, not microbench. */
import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import * as fast from '../../src/lib/omega/utf8-wire';
// Supplied by fastscan-experiment.patch only when building the benchmark bundle.
const setUtf8FastScan=(enabled:boolean)=>(fast as unknown as {setUtf8FastScan:(v:boolean)=>void}).setUtf8FastScan(enabled);
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const old=new Map(fs.readFileSync('bench/x144/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>{const a=JSON.parse(l);return[a.path,a.message]}));
for(const path of ['bench/holdout-work/kb-article.txt','bench/holdout-x41/ps-real.txt','bench/holdout-x40/metrics.tsv']){
 const text=fs.readFileSync(path,'utf8');setUtf8FastScan(false);assert.equal(tagstackEncode(text).message,old.get(path));
 for(const [round,order] of ['ABBA','BAAB'].entries())for(const arm of order){
  setUtf8FastScan(arm==='B');const t=performance.now(),r=tagstackEncode(text),ms=performance.now()-t;
  assert.equal(r.message,old.get(path));assert.equal(r.decoded,text);
  console.log(JSON.stringify({path,round,order,arm,ms,tokens:r.messageTokens,sourceExact:true,messageIdentical:true}));
 }
}
