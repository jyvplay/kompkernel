import fs from 'node:fs';import assert from 'node:assert/strict';import {countTokens,countTokensExact,chunkCacheClear} from '../../src/lib/omega/bpe';
let checks=0;for(const enc of ['o200k_base','cl100k_base'] as const){
 for(let pass=0;pass<2;pass++){chunkCacheClear();for(let a=0;a<256;a++)for(let b=0;b<256;b++){const s=String.fromCharCode(a,b),v=countTokensExact(s,enc);assert.equal(countTokens(s,enc),v);assert.equal(countTokens(s,enc),v);checks+=2;}}
 for(const a of [255,256,0xd800,0xdc00,0xffff])for(const b of [255,256,0xd800,0xdc00,0xffff]){const s=String.fromCharCode(a,b);assert.equal(countTokens(s,enc),countTokensExact(s,enc));checks++;}
}
console.log(JSON.stringify({checks,scope:'All Latin-1 pairs, hits, clearing, both encodings; Unicode fallback and surrogate boundaries'}));
