import fs from 'node:fs';import assert from 'node:assert/strict';import {fastCount} from '../../src/lib/omega/bpe-fast';import {encode} from 'gpt-tokenizer/encoding/o200k_base';let checks=0,seed=182;
for(const n of [1,2,3,15,16,31,32,33,63,64,127,255,511,1023,1024,1025,4096])for(const piece of ['a','ab','🙂','é','a\u0301','\t','\ud800']){const s=piece.repeat(n);assert.equal(fastCount(s),encode(s).length);checks++;}
for(let i=0;i<4000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;let s='';for(let j=0;j<8+seed%160;j++)s+='abcxyz0123 .!\n\t'[(seed>>>(j%25))%15];assert.equal(fastCount(s),encode(s).length);checks++;}
console.log(JSON.stringify({checks,scope:'Full pretoken+merge differential at memmove threshold and long-buffer boundary; Unicode, ties/repeats and lone surrogates'}));
