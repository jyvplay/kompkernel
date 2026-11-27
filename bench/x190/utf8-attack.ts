import assert from 'node:assert/strict';import {fastReady,fastCount,libraryChunkCount} from '../../src/lib/omega/bpe-fast';
assert(fastReady());let checks=0;
for(const c of ['a','é','Ж','中','🙂','\ud800','\udc00','\u0000','\uffff'])for(const n of [0,1,2,3,127,128,255,256,340,341,342,511,512,1023,1024])for(const tail of ['', ' x','\r\n']){
 const s=c.repeat(n)+tail;assert.equal(fastCount(s),libraryChunkCount(s));checks++;
}
for(let i=0;i<128;i++){const s=String.fromCharCode(0xd800+i)+'α'+String.fromCharCode(0xdc00+i)+'中';assert.equal(fastCount(s),libraryChunkCount(s));checks++;}
console.log(JSON.stringify({checks,passed:true,scope:'UTF-8 scratch boundary, mixed width, lone surrogates, fallback sizes'}));
