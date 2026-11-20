import * as fs from 'node:fs';
import {fastCount} from '../../src/lib/omega/bpe-fast';
import {encode,setMergeCacheSize} from 'gpt-tokenizer/encoding/o200k_base';
setMergeCacheSize(0);
const rows=[];
for(const n of [1023,1024,1025,2048,4096])for(const unit of ['a','abcdefghij','🙂','абвг']){
 const text=unit.repeat(Math.ceil(n/unit.length)).slice(0,n);const t=performance.now();
 const fast=fastCount(text),ms=performance.now()-t,ref=encode(text).length;
 rows.push({n,unit,fast,ref,exact:fast===ref,ms});
}
console.log(JSON.stringify(rows,null,2));
