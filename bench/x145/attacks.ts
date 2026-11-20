import assert from 'node:assert/strict';import {scalarCompile,scalarCollect,scalarCollecting,scalarOffer,SCALAR_HEADERS} from '../../src/lib/omega/scalar';
const h=SCALAR_HEADERS[0],valid=h+'§А\ud800¶А\udc00';
const bad=[['header','Other'+valid],['stable',h+'§Аx¶А'],['no-body',h+'§А\ud800'],['high',h+'§А\ud800¶А'],['low',h+'§А\udc00¶А'],['interrupt',h+'§А\ud800¶Аx\udc00'],['two-high',h+'§А\ud800¶А\ud801\udc00'],['self',h+'§АА\ud800¶А\udc00'],['forward',h+'§АББ\ud800¶А\udc00'],['unbound',h+'§А\ud800¶Б\udc00'],['bad-source',valid,'bad'],['oversize','x'.repeat(100001)],['source-low',h+'§Аx\udc00¶А'],['source-high',h+'§Аx\ud800¶А'],['empty-tape',h+'§¶\ud800']];
for(const [name,m,s] of bad)assert.equal(scalarCompile(m,s),null,name);
let tape='';for(let i=0;i<129;i++)tape+=String.fromCharCode(0x410+i)+'\ud800';assert.equal(scalarCompile(h+'§'+tape+'¶А\udc00'),null);
assert.throws(()=>scalarCollect('𐀀','o200k_base',()=>{throw Error('forced');}));assert.equal(scalarCollecting(),false);
const a=scalarCollect('𐀀','o200k_base',()=>{for(let i=0;i<40;i++)scalarOffer(valid,'𐀀','o200k_base');scalarOffer(valid,'different','o200k_base');return 1;});assert.equal(a.offered,1);assert.equal(a.repair?.decoded,'𐀀');assert.equal(a.base,1);assert.equal(scalarCollecting(),false);
for(const header of SCALAR_HEADERS)assert.equal(scalarCompile(header+valid.slice(h.length),'𐀀')?.decoded,'𐀀');
console.log(JSON.stringify({invalidShapes:bad.map(a=>a[0]),ruleCap:true,exceptionCleanup:true,dedup:true,sourceScope:true,headers:4}));
