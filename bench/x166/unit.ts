import fs from 'node:fs';import assert from 'node:assert/strict';import {symfrazPlans,symfrazRead,symfrazUndo,symfrazKey,symfrazFromFrontier,SYMFRAZ_CAP} from '../../src/lib/omega/symfraz';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
let checks=0;const pairs:{source:string;message:string;k:number;folded:string}[]=[];
function test(source:string){for(const p of symfrazPlans(source)){assert.ok(Buffer.from(symfrazRead(p.message)).equals(Buffer.from(source)));assert.equal(encode(p.message).length,p.tokens);checks+=2;pairs.push({source,message:p.message,k:p.k,folded:p.folded});}}
for(const s of ['', '0 00 000 0000','a01b02a03b04','12😀4 56é7','𝄞1\uE0002😀3','1\r\n2\t03\u00004','11~22','é123 é456','123x000 456x000','1'.repeat(24999)+'x'+'2'.repeat(25000)])test(s);
const alphabet=['a','b','0','1',' ','\n','😀'];let seed=166;for(let n=0;n<1500;n++){let s='';for(let i=0;i<n%97;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;s+=alphabet[seed%alphabet.length];}test(s);}
for(const k of [1,4,12])for(const bad of ['','1','\n~','1  2\n~~','1\n','1 2\n~','01 -2\n~~','1\n~'.repeat(20000)]){assert.throws(()=>symfrazUndo(bad,k));checks++;}
for(const s of ['\ud800','x'.repeat(SYMFRAZ_CAP+1)]){assert.throws(()=>symfrazPlans(s));checks++;}
assert.throws(()=>symfrazKey(2));checks++;
// Patch-targeted keys: frozen holes vs restored digits; scalar vs UTF16 order.
for(const s of ['9~8','𐀀1\uE0002𐀀3\uE0004','12a34a56a78','1 2 3 4 5'])test(s);
const source='A 12345 B 67890 A 23456 B 78901';let calls=0;const r=symfrazFromFrontier(source,source,s=>s,()=>{calls++;throw Error('parent refusal');},s=>s);assert.equal(r.message,source);assert.equal(calls,1);checks+=2;
assert.throws(()=>symfrazFromFrontier(source,'wrong',s=>s,s=>s,s=>s));checks++;
// Resource repair: reject oversize/unstable parent wire before pricing or reading.
for(const parent of ['z'.repeat(51001),'\ud800']){let reads=0;const q=symfrazFromFrontier(source,source,s=>s,()=>parent,()=>{reads++;return source;});assert.equal(q.message,source);assert.equal(reads,0);checks+=2;}
fs.writeFileSync('bench/x166/receipts/unit-pairs.json',JSON.stringify(pairs));fs.writeFileSync('bench/x166/receipts/unit.json',JSON.stringify({checks,pairs:pairs.length,native:'NOT_RUN',passed:true},null,2));console.log({checks,pairs:pairs.length});
