import fs from 'node:fs';import assert from 'node:assert/strict';import {kryptolysisRotate,kryptolysisKey,kryptolysisRead,kryptolysisPlans,kryptolysisFromFrontier} from '../../src/lib/omega/kryptolysis';
let checks=0,seed=164;const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;const rows=[];
const alphabet=Array.from({length:128},(_,i)=>String.fromCharCode(i)).join('')+'é😀中\r\n';
for(let k=1;k<26;k++){const folded=kryptolysisRotate(alphabet,26-k);assert.equal(kryptolysisRotate(folded,k),alphabet);assert.equal(kryptolysisRead(kryptolysisKey(k)+folded,s=>s),alphabet);rows.push({k,source:alphabet,folded});checks+=2;}
for(let i=0;i<3000;i++){let source='';for(let j=0;j<1+rand()%150;j++)source+=String.fromCodePoint([32+rand()%95,0x400+rand()%256,0x1f600+rand()%70][rand()%3]);const k=1+rand()%25,folded=kryptolysisRotate(source,26-k);assert.equal(kryptolysisRotate(folded,k),source);assert.ok(Buffer.from(kryptolysisRead(kryptolysisKey(k)+folded,s=>s)).equals(Buffer.from(source)));rows.push({k,source,folded});checks+=2;}
for(const k of [0,26,-1,NaN,Infinity,1.5]){assert.throws(()=>kryptolysisKey(k));assert.throws(()=>kryptolysisRotate('a',k));checks+=2;}
for(const s of ['\ud800','\udc00','x'.repeat(50001)]){assert.throws(()=>kryptolysisRotate(s,13));checks++;}
for(const k of ['0','26','01','-1','1.5']){assert.throws(()=>kryptolysisRead(kryptolysisKey(13).replace('13',k)+'abc',s=>s));checks++;}
assert.equal(kryptolysisRotate('a'.repeat(50000),13),'n'.repeat(50000));checks++;
assert.throws(()=>kryptolysisFromFrontier('x','wrong',s=>s,s=>s,s=>s));assert.throws(()=>kryptolysisFromFrontier('x',kryptolysisKey(13)+'k',()=> 'x',s=>s,s=>s));checks+=2;
let calls=0;const empty=kryptolysisFromFrontier('123','123',s=>s,s=>{calls++;return s;},s=>s);assert.equal(calls,0);assert.equal(empty.message,'123');checks+=2;
const fallback=kryptolysisFromFrontier('Hello world.','Hello world.',s=>s,()=>{throw Error('parent unavailable');},s=>s);assert.equal(fallback.message,'Hello world.');assert.equal(fallback.parentCalls,2);checks+=2;
assert.equal(kryptolysisPlans('ABC').length,25);checks++;
fs.writeFileSync('bench/x164/receipts/kryptolysis-unit-pairs.json',JSON.stringify(rows));fs.writeFileSync('bench/x164/receipts/kryptolysis-unit.json',JSON.stringify({checks,passed:true,generated:3000,seed:164},null,2));console.log({checks});
