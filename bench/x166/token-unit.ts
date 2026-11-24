import fs from 'node:fs';import assert from 'node:assert/strict';import {countTokens,countTokensExact,chunkCacheClear} from '../../src/lib/omega/bpe';
let checks=0,seed=166;const atoms=['a',' ',"'s",'😀','\ud800','\udc00','\r','\n','é','中','000','~','§'];
for(const enc of ['o200k_base','cl100k_base'] as const){chunkCacheClear();
 for(let n=0;n<3000;n++){let s='';for(let j=0;j<n%107;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;s+=atoms[seed%atoms.length];}
  const detached=s.length>12?(' '+s).slice(1):s;assert.equal(detached,s);const truth=countTokensExact(s,enc);assert.equal(countTokens(s,enc),truth);assert.equal(countTokens(s,enc),truth);checks+=3;
 }
}
fs.writeFileSync('bench/x166/receipts/token-unit.json',JSON.stringify({checks,passed:true,scope:'both encodings, cache hits/misses, Unicode/surrogate and whitespace boundaries'},null,2));console.log(checks);
