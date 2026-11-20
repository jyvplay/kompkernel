import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {readParent} from '../x135/reader';
let prices=0,sharedReaderExact=0;const unsupported:string[]=[];
for(const name of ['frontier','heldout-baseline'])for(const line of fs.readFileSync(`bench/x141/receipts/${name}.jsonl`,'utf8').trim().split('\n')){
 const a=JSON.parse(line);assert.equal(encode(a.message).length,a.tokens);prices++;
 const src=fs.readFileSync(a.path,'utf8');assert.equal(a.text,src);
 if(a.message===src||['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(p=>a.message.startsWith(p+'§'))){assert.equal(readParent(a.message),src);sharedReaderExact++;}else unsupported.push(a.path);
}
for(const name of ['probe','heldout-probe','interior','parent','heldout-parent'])for(const line of fs.readFileSync(`bench/x141/receipts/${name}.jsonl`,'utf8').trim().split('\n')){
 const a=JSON.parse(line);if(!a.message)continue;assert.equal(encode(a.message).length,a.B);prices++;
}
console.log(JSON.stringify({referenceTokenizerPrices:prices,sharedReaderExact,unsupported,nativeVerified:false},null,2));
