import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';import {diadochiPlans,diadochiUndo,diadochiRead,diadochiFromFrontier,DIADOCHI_KEY} from '../../src/lib/omega/diadochi';
let checks=0;const rows:any[]=[],pairs:any[]=[];const paths=[...fs.readFileSync('bench/x168/lanes.txt','utf8').trim().split('\n'),...fs.readdirSync('bench/x165/fixtures').map(n=>'bench/x165/fixtures/'+n)];
function check(s:string,save=false){for(const p of diadochiPlans(s)){assert.ok(Buffer.from(diadochiRead(p.message)).equals(Buffer.from(s)));assert.equal(encode(p.message).length,p.tokens);assert.equal(decode(encode(p.message)),p.message);checks+=3;if(save)pairs.push({source:s,folded:p.folded});}}
for(const path of paths){const bytes=fs.readFileSync(path),s=bytes.toString();assert.ok(Buffer.from(s).equals(bytes));const plans=diadochiPlans(s);check(s);rows.push({path,raw:encode(s).length,plans});}
let seed=168;function rand(n:number){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
const atoms=['deployment','analysis','learning','study','the','','é','😀','\r\n','\t','"','^','000'];for(let i=0;i<1000;i++){const a=[];for(let j=0,n=20+rand(150);j<n;j++)a.push(atoms[rand(atoms.length)]);check(a.join(' '),true);}
for(const s of ['', 'a',' ','  ',' a a a ','a a a a a','a b a c a d a','é\r\n '.repeat(40),'__proto__ constructor '.repeat(20),'a  b   a  b   a  b   '])check(s,true);
// Null is no fields; empty string is exactly one empty field. Patch-targeted.
assert.equal(diadochiUndo('["",null,[]]'),'');assert.equal(diadochiUndo('["","",[]]'),' ');checks+=2;
for(const wire of ['[]','["a",[],[]]','["a",null,[["a",null],["a","b"]]]','["a",null,[["b","x"]]]','["a","b",[["a",null]]]','["a b",null,[]]','["a",42,[]]','["a",null,[["a",["b"]]]]']){assert.throws(()=>diadochiUndo(wire));checks++;}
assert.throws(()=>diadochiPlans('\ud800'));assert.throws(()=>diadochiPlans('a'.repeat(50001)));checks+=2;
const s='deployment analysis '.repeat(40);let called=0;const result=diadochiFromFrontier(s,s,x=>x,()=>{called++;return 'WRONG';},x=>x);assert.ok(result.tokens<=encode(s).length);assert.equal(result.applied?diadochiRead(result.message):result.message,s);assert.equal(called,1);checks+=3;
// Counterexample: the same transition multiset does not fix original order.
const a='a b a c a',b='a c a b a';assert.notEqual(a,b);assert.deepEqual(a.split(' ').slice(1).map((x,i)=>a.split(' ')[i]+'>'+x).sort(),b.split(' ').slice(1).map((x,i)=>b.split(' ')[i]+'>'+x).sort());checks+=2;
fs.writeFileSync('bench/x168/receipts/screen.json',JSON.stringify({checks,sources:rows.length,rows,native:'NOT_RUN'},null,2));fs.writeFileSync('bench/x168/receipts/unit-pairs.json',JSON.stringify(pairs));console.log({checks,pairs:pairs.length,sources:rows.length,plans:rows.reduce((n,r)=>n+r.plans.length,0),wins:rows.filter(r=>r.plans.some((p:any)=>p.tokens<r.raw)).map(r=>({path:r.path,raw:r.raw,best:r.plans[0].tokens}))});
