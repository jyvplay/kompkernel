import assert from 'node:assert/strict';import {countTokens,countTokensExact} from '../../src/lib/omega/bpe';
let checks=0,seed=170;const rnd=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let i=0;i<120;i++)for(const n of [1023,1024,1025]){
 let s='';for(let k=0;k<n;k++)s+=String.fromCharCode(97+rnd()%26);
 for(const text of [s,s.slice(0,250)+'😀é中'+s.slice(250),s+'\ud800',s.split('').reverse().join('')])for(const enc of ['o200k_base','cl100k_base'] as const){assert.equal(countTokens(text,enc),countTokensExact(text,enc));checks++;}
}
console.log(JSON.stringify({checks,scope:'alternating fresh ASCII/Unicode/surrogate inputs around scratch boundary; detects stale slice-string state',seed:170}));
