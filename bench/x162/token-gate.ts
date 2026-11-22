import {decode as rawO} from 'gpt-tokenizer/encoding/o200k_base';
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {tokenStrings,encodeIds,decodeIds,type EncodingName} from '../../src/lib/omega/bpe';
let seed=162,checks=0;const rnd=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;const strings=['','\ufeff','\ud800','😀',' café','\r\n','a\udc00z','\u0000',' кириллица','한글'];
for(let i=0;i<1500;i++){let s='';for(let j=0;j<1+rnd()%30;j++)s+=String.fromCharCode(rnd()%65536);strings.push(s);}
for(const line of fs.readFileSync('bench/x162/lanesB.txt','utf8').trim().split('\n'))strings.push(fs.readFileSync(line,'utf8'));
const hash=crypto.createHash('sha256');for(const enc of ['o200k_base','cl100k_base'] as EncodingName[])for(const s of strings){const a=tokenStrings(s,enc),saved=JSON.stringify(a);hash.update(enc+'\0'+saved);assert.deepEqual(a.map(t=>t.id),encodeIds(s,enc));const b=tokenStrings(s,enc);assert.equal(JSON.stringify(b),saved);if(a.length){a[0].s='MUTATED';a[0].id=-1;}a.push({id:-2,s:'poison'});decodeIds([439],enc);rawO([439]);assert.equal(JSON.stringify(tokenStrings(s,enc)),saved);checks+=3;}
// Force bounded-cache turnover, then revisit the same values.
for(let i=0;i<5000;i++)tokenStrings('eviction '+i+' '+('abc '.repeat(30)),'o200k_base');
for(const s of strings.slice(0,10))hash.update(JSON.stringify(tokenStrings(s,'o200k_base')));
console.log(JSON.stringify({checks,hash:hash.digest('hex'),seed:162,scope:'both encodings, mutation isolation, decoder contamination, surrogate/BOM, cache turnover'}));
