import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {CountMemoGenerations} from '../../src/lib/omega/count-memo-generations';
import * as counter from '../../src/lib/omega/bpe';
const {countTokens,countTokensExact,setCountMemoBudget,chunkCacheStats}=counter;
const setGenerationalCountMemo=(counter as unknown as {setGenerationalCountMemo:(enabled:boolean)=>void}).setGenerationalCountMemo;
if(typeof setGenerationalCountMemo!=='function')throw Error('Apply bench/x140/memo-experiment.patch before building this experimental harness; reverse the patch afterward.');
let checks=0;
for(const bad of [NaN,Infinity,-1]){assert.throws(()=>new CountMemoGenerations(bad));checks++;}
for(const bad of [NaN,Infinity,-1,0.5]){assert.throws(()=>new CountMemoGenerations(100,bad));checks++;}
for(const budget of [0,1,2,15,256,2048]){
 const memo=new CountMemoGenerations(budget,12),truth=new Map<string,number>();
 for(let i=0;i<1000;i++){
  const key=String((i*31)%79).repeat(i%13),value=key.length;truth.set(key,value);memo.set(key,value);
  for(const [k,v]of truth){const hit=memo.get(k);if(hit!==undefined)assert.equal(hit,v);checks++;}
  assert.ok(memo.stats().chars<=budget);assert.ok(memo.stats().size<=12);checks+=2;
 }
 memo.clear();assert.equal(memo.stats().size,0);checks++;
}
for(const mode of [false,true])for(const budget of [0,128,4096]){
 setGenerationalCountMemo(mode);setCountMemoBudget(budget);
 for(const enc of ['o200k_base','cl100k_base']as const)for(const line of fs.readFileSync('bench/x139/receipts/frontier.jsonl','utf8').trim().split('\n')){
  const a=JSON.parse(line);for(const s of [a.text,a.message,'\ufeff'.repeat(1025),'\ud800\n\udfff'.repeat(9)]){assert.equal(countTokens(s,enc),countTokensExact(s,enc));checks++;}
 }
 if(mode)assert.ok(chunkCacheStats().longChars<=budget*2); // separate per-encoding budgets
}
setGenerationalCountMemo(false);setCountMemoBudget(2000000);
console.log(JSON.stringify({checks,scope:'exact counts and cache budgets, no speed inference'}));
