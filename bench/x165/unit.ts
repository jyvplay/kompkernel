import fs from 'node:fs';import assert from 'node:assert/strict';import {deiktisPlans,deiktisPlan,deiktisUndo,deiktisKey,deiktisRead,deiktisFromFrontier} from '../../src/lib/omega/deiktis';import {blockSort,blockUndo} from './block-sort';
let checks=0,seed=165;const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;const pairs:any[]=[];
function test(s:string){for(const p of deiktisPlans(s)){assert.equal(deiktisUndo(p.folded,p.k),s);assert.ok(Buffer.from(deiktisRead(p.contract+p.folded,x=>x)).equals(Buffer.from(s)));pairs.push({source:s,folded:p.folded,k:p.k});checks+=2;}const b=blockSort(s);assert.equal(blockUndo(b.folded,b.index),s);checks++;}
for(const s of ['',' ', '  ','a b a b','😀 é\n\r\t\0 X 😀 é\n\r\t\0 X','abc abc abc','p~q p~q','abcd e\u0301 abcd e\u0301 ','the ordinary work notes are repeated here. the ordinary work notes are repeated here.'])test(s);
for(let i=0;i<1200;i++){const words=Array.from({length:8+rand()%18},()=>['alpha','beta','gamma','é','😀','\n','\r\n','\0','δ','空',' '][rand()%11]);const a=words.join(' '),b=words.toReversed().join(' ');test(a+'\n'+b+'\n'+a+' '+b);}
for(const s of ['~0;','~01;','~1;','abcd~12;','abcdXabcd~6;','abcdXabcd~9999;','abcdXabcd~4097;','abcdXabcd~1','abcdXabcd~1x;']){assert.throws(()=>deiktisUndo(s,4));checks++;}
assert.equal(deiktisUndo('abcdXabcd~1;',4),'abcdXabcdX');checks++;
// Shadowing attack: latest context takes priority even when an older match is longer.
assert.throws(()=>deiktisUndo('abcdLONGPAYLOADabcdZabcd~10;',4));checks++;
for(const s of ['\ud800','x'.repeat(50001)]){assert.throws(()=>deiktisPlans(s));checks++;}
assert.equal(deiktisPlan('hello ~1; hello ~1;',4,12),null);assert.throws(()=>deiktisPlan('abc',3,12));assert.throws(()=>deiktisPlan('abc',4,13));checks+=3;
assert.throws(()=>deiktisRead('unknown',x=>x));assert.throws(()=>deiktisFromFrontier('abc','wrong',x=>x,x=>x,x=>x));assert.throws(()=>deiktisFromFrontier('abc',deiktisKey(4)+'abc',()=> 'abc',x=>x,x=>x));checks+=3;
const out=deiktisFromFrontier('short ordinary sentence','short ordinary sentence',x=>x,x=>x,x=>x);assert.equal(out.applied,false);assert.equal(out.parentCalls,0);checks+=2;
// Scalar count differs from UTF16units. Snapshot copy includes a full emoji.
assert.equal(deiktisUndo('abcd😀abcd~1;',4),'abcd😀abcd😀');checks++;
const cap='abcd'+'z'.repeat(49992)+'abcd';assert.equal(cap.length,50000);assert.throws(()=>deiktisUndo(cap+'~1;',4));checks+=2;
const bomb='abcd'+'x'.repeat(49970)+'abcd~4096;';assert.ok(bomb.length<50000);assert.throws(()=>deiktisUndo(bomb,4));checks+=2;
assert.throws(()=>deiktisFromFrontier('abc','x'.repeat(51001),()=> 'abc',x=>x,x=>x));checks++;
fs.writeFileSync('bench/x165/receipts/unit-pairs.json',JSON.stringify(pairs));fs.writeFileSync('bench/x165/receipts/unit.json',JSON.stringify({checks,pairs:pairs.length,generatedSources:1200,seed:165,native:'NOT_RUN'},null,2));console.log({checks,pairs:pairs.length});
