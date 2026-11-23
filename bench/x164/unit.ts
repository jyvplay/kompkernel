import fs from 'node:fs';import assert from 'node:assert/strict';import {ANTIKLEIS_SLASH_KEY,antikleisPlan,antikleisUndo,antikleisRead,antikleisFromFrontier,ANTIKLEIS_KEY} from '../../src/lib/omega/antikleis';
let checks=0,seed=164;const rand=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;const pairs:{source:string,folded:string}[]=[];
const yes=(s:string)=>{const p=antikleisPlan(s);assert.ok(p,s);assert.equal(antikleisUndo(p.folded),s);assert.equal(antikleisRead(ANTIKLEIS_KEY+p.folded,x=>x),s);assert.ok(Buffer.from(antikleisUndo(p.folded)).equals(Buffer.from(s)));pairs.push({source:s,folded:p.folded});checks+=4;};
for(const s of ['<a></a>','<A><b x="1 > 0"/>word<c>😀&amp;</c></A>','<?xml version="1.0"?>\r\n<root><!-- <fake></fake> --><![CDATA[<bad>]]><n>x</n></root>','<a>text</a   ><b>é</b>','<x:a xmlns:x="url"><b-c q = \'v\'>0</b-c></x:a>','<a><a><a/></a></a>','<r>\ud83d\ude00\u0000</r>'])yes(s);
// New short-contract adversary: opaque fake opens and self-close must not steal the name.
yes('<r><!-- <decoy> --><real attr="x > y"/><last>ok</last><![CDATA[<fake>]]></r>');
for(let t=0;t<4000;t++){
 const names=Array.from({length:1+rand()%12},(_,i)=>['Tag','long_name','ns:X','A-B','_n'][rand()%5]+i);let s=names.map(n=>'<'+n+' x="a > b" y=\'&lt;\'>').join('');s+=(rand()%2?'<!-- <ignored/> -->':'<![CDATA[<not-a-tag>]]>')+'text '+rand()+' é😀';s+=names.toReversed().map(n=>'</'+n+'>').join('');yes(s);
 assert.equal(antikleisPlan(s.replace('</'+names.at(-1)+'>','</wrong>')),null);checks++;
}
for(const s of ['','plain prose','<a>','</a>','<a></b>','<a></>','<!-- </> -->','<a x="unclosed></a>','<a x="<b>"></a>','<!DOCTYPE a><a></a>','<a naked></a>','<a><br></a>','<é></é>','<a>\ud800</a>','<a>'.repeat(129)+'</a>'.repeat(129),'x'.repeat(50001)]){assert.equal(antikleisPlan(s),null);checks++;}
for(const s of ['</>','<a></></>','<a></b>','<a>','<a x="<"></>','<a>'.repeat(129)+'</>'.repeat(129)]){assert.throws(()=>antikleisUndo(s));checks++;}
// Expanded-name amplification: folded input fits, reconstructed output exceeds cap.
const name='a'.repeat(300);const bomb=('<'+name+'>').repeat(120)+'<>'.repeat(120);assert.ok(bomb.length<50000);assert.throws(()=>antikleisUndo(bomb));checks+=2;
// Patch-specific attack: a short-contract packet must not accept the old marker.
assert.throws(()=>antikleisRead(ANTIKLEIS_KEY+'<a></>',s=>s));assert.throws(()=>antikleisRead(ANTIKLEIS_SLASH_KEY+'<a><>',s=>s));checks+=2;
const legacy=antikleisPlan('<a><b>x</b></a>','slash');assert.ok(legacy);assert.equal(antikleisRead(ANTIKLEIS_SLASH_KEY+legacy.folded,s=>s),'<a><b>x</b></a>');checks++;
yes('<a>'.repeat(128)+'</a>'.repeat(128));
const capSource='<a>'+'x'.repeat(49993)+'</a>';assert.equal(capSource.length,50000);const capPlan=antikleisPlan(capSource);assert.ok(capPlan);assert.equal(antikleisUndo(capPlan.folded),capSource);assert.throws(()=>antikleisRead(ANTIKLEIS_KEY+capPlan.folded,s=>s));checks+=4;
let calls=0;assert.throws(()=>antikleisFromFrontier('<a></a>',ANTIKLEIS_KEY+'<a></>',()=>'<a></a>',s=>{calls++;return s;},s=>s));assert.equal(calls,0);checks+=2;
assert.throws(()=>antikleisRead('wrong',s=>s));assert.throws(()=>antikleisFromFrontier('<a></a>','wrong',s=>s,s=>s,s=>s));checks+=2;
const fallback=antikleisFromFrontier('<a></a>','<a></a>',s=>s,s=>{throw Error('parent failed');},s=>s);assert.equal(fallback.message,'<a></a>');assert.equal(fallback.applied,false);checks+=2;
fs.writeFileSync('bench/x164/receipts/unit-pairs.json',JSON.stringify(pairs));fs.writeFileSync('bench/x164/receipts/unit.json',JSON.stringify({checks,generatedSources:4000,seed:164,passed:true},null,2));console.log({checks});
