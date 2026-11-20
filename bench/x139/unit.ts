import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {APOTOME_KEY,apotomeDecode,apotomeExpand,apotomeTrial,apotomeFromFrontier} from '../../src/lib/omega/apotome';
let checks=0;
for(const [wire,want]of [['§а~б3|бabcdef¶аб','abcabcdef'],['§а~б-3|бabcdef¶а','def'],['§а~б3|б~в4|вabcdef¶аб','abcabcd'],['§аabcбаd¶б\n','abcd\n'],['§а~б3|бabcdef¶','']] as const){assert.equal(apotomeDecode(APOTOME_KEY+wire),want);checks++;}
for(const wire of ['§а~б0|бabc¶а','§а~б04|бabc¶а','§а~б4|бabc¶а','§а~б-4|бabc¶а','§а~б3|¶а','§а~б1|б~а1|¶','§а~а1|¶а','§а~б3бabc¶а','§а🙂¶а']){assert.throws(()=>apotomeDecode(APOTOME_KEY+wire));checks++;}
assert.throws(()=>apotomeDecode('§аabc¶а'));checks++;
assert.throws(()=>apotomeDecode(APOTOME_KEY+'§аabc¶'+'x'.repeat(100001)));checks++;
assert.equal(apotomeTrial('Reverse decoded output.\n§аabc¶а'),null);checks++;
assert.equal(apotomeFromFrontier('¶ k=v. expand repeatedly; print only.\n§аabc¶а'),null);checks++;
assert.throws(()=>apotomeExpand([{g:'а',v:'abc'},{g:'а',v:'def'}],'а'));checks++;
// Patch-specific dependency attack: two changes can break a formerly cyclic single view.
assert.throws(()=>apotomeExpand([{g:'а',v:'~б6|'},{g:'б',v:'аghi'},{g:'в',v:'abcdefghiJK'}],'аб'));checks++;
assert.equal(apotomeExpand([{g:'а',v:'~б6|'},{g:'б',v:'~в9|'},{g:'в',v:'abcdefghiJK'}],'аб'),'abcdefabcdefghi');checks++;
// Bounds and sign are tested independently of the encoder, including full views.
for(let len=1;len<=100;len++)for(let n=1;n<=len;n++)for(const sign of [1,-1]){
 const s='abcdefghijklmnopqrstuvwxyz'.repeat(4).slice(0,len),wire=`§а~б${sign*n}|б${s}¶а`;
 assert.equal(apotomeDecode(APOTOME_KEY+wire),sign>0?s.slice(0,n):s.slice(-n));checks++;
}
for(const l of fs.readFileSync('bench/x139/receipts/probe.jsonl','utf8').trim().split('\n')){const r=JSON.parse(l);if(r.message){assert.equal(apotomeDecode(r.message),r.target);checks++;}}
// Modal shortcut detector: distinct originals cannot share a residual-free normalized wire.
const a='Policy A.\n',b='policy  A.';assert.notEqual(a,b);assert.equal(a.toLowerCase().replace(/\s+/g,' ').trim(),b.toLowerCase().replace(/\s+/g,' ').trim());checks+=2;
console.log(JSON.stringify({checks,nativeVerified:false,syntheticInputs:'adversarial mechanics only, not claimed real-workload gains'}));
