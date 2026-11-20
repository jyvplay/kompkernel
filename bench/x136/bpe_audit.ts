import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {fastCount,fastReady} from '../../src/lib/omega/bpe-fast';
import {encode,setMergeCacheSize} from 'gpt-tokenizer/encoding/o200k_base';
setMergeCacheSize(0);fastReady();let checks=0,fastMs=0,libraryMs=0;
function test(text:string){let t=performance.now();const a=fastCount(text);fastMs+=performance.now()-t;t=performance.now();const b=encode(text).length;libraryMs+=performance.now()-t;assert.equal(a,b,`length ${text.length}: ${text.slice(0,30)}`);checks++;}
for(const n of [0,1,511,512,513,1023,1024,1025,2048,4096,8192])for(const s of ['a','abcdefghij','🙂','абвг','\ufeff','é','\ud800'])test(s.repeat(Math.ceil(n/s.length)).slice(0,n));
// Deterministic generated adversaries, not real-workload compression evidence.
let seed=136;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let i=0;i<100;i++){let s='';const n=1020+(rand()>>>16)%1500;for(let j=0;j<n;j++)s+=['a','b','c','d','ж','ш','щ','ч'][(rand()>>>16)%8];test(s);}
for(const line of fs.readFileSync('bench/x135/receipts/frontier.jsonl','utf8').trim().split('\n')){const r=JSON.parse(line);test(r.text);test(r.message);}
console.log(JSON.stringify({mode:process.env.OMEGA_LONG_BPE_SCAN==='1'?'repaired-scan':'heap',checks,fastMs,libraryMs,scope:'counter differential tests; not whole-stack speed evidence'}));
