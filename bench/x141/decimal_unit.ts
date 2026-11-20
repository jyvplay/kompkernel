import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {decimalTokenCount} from '../../src/lib/omega/decimal-token-count';
import * as bpe from '../../src/lib/omega/bpe';
const toggle=(bpe as unknown as {setDecimalFast:(b:boolean)=>void}).setDecimalFast;
if(!toggle)throw Error('Build with bench/x141/build-speed.sh');
let checks=0;
for(const enc of ['o200k_base','cl100k_base']as const){
 for(let len=1;len<=3;len++)for(let i=0;i<10**len;i++){const s=String(i).padStart(len,'0');assert.equal(bpe.countTokensExact(s,enc),1);assert.equal(decimalTokenCount(s),1);checks+=2;}
 let state=141;for(let i=1;i<=500;i++){
  let s='';const len=1+i*7%4096;for(let j=0;j<len;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;s+=String((state>>>16)%10);}
  assert.equal(decimalTokenCount(s),bpe.countTokensExact(s,enc));checks++;
 }
 for(const s of ['','123\n','123 ',' 123','-123','123.45','١٢٣','１２３','123😀','123\ud800','123\ufeff','123\0','123e4']){assert.equal(decimalTokenCount(s),null);checks++;}
 for(const mode of [false,true]){
  toggle(mode);
  for(const l of fs.readFileSync('bench/x140/receipts/frontier.jsonl','utf8').trim().split('\n')){const a=JSON.parse(l);for(const s of [a.text,a.message,...(a.text.match(/[0-9]+/g)??[])]){assert.equal(bpe.countTokens(s,enc),bpe.countTokensExact(s,enc));checks++;}}
 }
}
toggle(false);console.log(JSON.stringify({checks,exhaustiveShortStringsPerEncoding:1110,generatedLongStringsPerEncoding:500,nativeVerified:false}));
