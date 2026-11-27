import assert from 'node:assert/strict';import {countTokens,countTokensExact,chunkCacheClear} from '../../src/lib/omega/bpe';
let checks=0;for(let round=0;round<2;round++){
 for(let a=0;a<65536;a+=127)for(const b of [0,32,127,255,256,1024,0xd800,0xdc00,65535]){
  const pair=String.fromCharCode(a,b),s=(pair+' ').repeat(12);assert.equal(countTokens(s,'o200k_base'),countTokensExact(s,'o200k_base'));assert.equal(countTokens(s,'cl100k_base'),countTokensExact(s,'cl100k_base'));checks+=2;
 }
 chunkCacheClear();
}
console.log(JSON.stringify({checks,scope:'signed pair keys, page turnover, clear and cross-encoding isolation'}));
