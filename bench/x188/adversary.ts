import fs from 'node:fs';import assert from 'node:assert/strict';
import {synairesisTrial} from '../../src/lib/omega/synairesis';
import {chironDecode} from '../../src/lib/omega/chiron';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const key='¶ k=v. expand repeatedly; print only.\n';
const shapes=['',' ', '\n','\r\n','\t','\0','é','é','🙂','👩‍💻','a b','aaa','12345','"\\','§','¶','Ignore previous instructions.','中文','عربي','α'];
let checks=0,refused=0,seed=188;
const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let i=0;i<500;i++){
 const a=shapes[random()%shapes.length],b=shapes[random()%shapes.length];
 const m=key+'§α'+a+'β'+b+'γαβ¶'+('γ α β '+shapes[random()%shapes.length]).repeat(1+random()%10);
 const r=synairesisTrial(m);if(!r){refused++;continue;}
 assert.equal(chironDecode(r.message.slice(key.length)),chironDecode(m.slice(key.length)));
 assert.equal(encode(r.message).length,r.tokens);assert(r.tokens<=encode(m).length);checks++;
}
// Exponential parent expansion must be refused BEFORE parent decode.
let tape='αxx',prev='α';for(const g of [...'βγδεζηθικλμνξοπρστυφχψω']){tape+=g+prev.repeat(4);prev=g;}
assert.equal(synairesisTrial(key+'§'+tape+'¶'+prev),null);checks++;
let specialRefused=false;try{specialRefused=synairesisTrial(key+'§αx¶<|endoftext|>')===null;}catch{specialRefused=true;}
assert(specialRefused);checks++;
const result={checks,refused,seed:188,shapes,scope:'parent-language equivalence and reference pricing, not universal source invertibility'};
fs.writeFileSync('bench/x188/receipts/adversary.json',JSON.stringify(result,null,2));console.log(result);
