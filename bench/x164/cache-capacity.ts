import fs from 'node:fs';import assert from 'node:assert/strict';import {fastCount,chunkHits,chunkMisses} from '../../src/lib/omega/bpe-fast';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const word=(n:number)=>{let s='';for(let i=0;i<5;i++){s+=String.fromCharCode(0x430+(n%32));n=Math.floor(n/32);}return s;};let checks=0;
for(let i=0;i<70000;i++){const s=word(i);assert.equal(fastCount(s),encode(s).length);checks++;}
const before={hits:chunkHits,misses:chunkMisses};for(let i=0;i<100;i++){const s=word(i);assert.equal(fastCount(s),encode(s).length);checks++;}
console.log(JSON.stringify({checks,before,after:{hits:chunkHits,misses:chunkMisses},scope:'70000distinct lowercase Cyrillic single pre-tokens cross65536capacity; reference tokenizer, then revisit evicted keys'}));
