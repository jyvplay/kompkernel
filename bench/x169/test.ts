import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';import {gefyraPlans,gefyraUndo,gefyraRead,gefyraFromFrontier} from '../../src/lib/omega/gefyra';
let checks=0;const pairs:any[]=[],rows:any[]=[];
function check(s:string,save=false){for(const p of gefyraPlans(s)){assert.ok(Buffer.from(gefyraRead(p.message)).equals(Buffer.from(s)));assert.equal(encode(p.message).length,p.tokens);assert.equal(decode(encode(p.message)),p.message);checks+=3;if(save)pairs.push({source:s,folded:p.folded});}}
const paths=[...fs.readFileSync('bench/x169/lanes.txt','utf8').trim().split('\n'),...fs.readdirSync('bench/x165/fixtures').map(n=>'bench/x165/fixtures/'+n),...JSON.parse(fs.readFileSync('bench/x168/receipts/heldout-sources.json','utf8')).map((r:any)=>r.file)];
for(const path of paths){const b=fs.readFileSync(path),s=b.toString();assert.ok(Buffer.from(s).equals(b));check(s);rows.push({path,raw:encode(s).length,plans:gefyraPlans(s)});}
let seed=169;function rand(n:number){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
const atoms=['a','b','c','','\r\n','😀','é','__proto__','"'];for(let i=0;i<1000;i++){const a=[];for(let j=0,n=20+rand(120);j<n;j++)a.push(atoms[rand(i%2?atoms.length:4)]);check(a.join(' '),true);}
let exhaustive=0;for(let n=1;n<=7;n++)for(let k=0;k<3**n;k++){let v=k;const a=[];for(let i=0;i<n;i++){a.push(['','a','b'][v%3]);v=Math.floor(v/3);}check(a.join(' '),true);exhaustive++;}
assert.equal(gefyraUndo('[["a","b",""]]\na b'),'a  b');assert.equal(gefyraUndo('[["a","b","x"],["x","b","y"]]\na b'),'a x b');checks+=2;
for(const folded of ['[]\na b','[["a","b","x"],["a","b","y"]]\na b','[["a b","c","d"]]\na b','[["a","b",1]]\na b','[["a","b"]]\na b',JSON.stringify([['a','a','x'.repeat(1000)]])+'\n'+'a '.repeat(60)]){assert.throws(()=>gefyraUndo(folded));checks++;}
assert.throws(()=>gefyraPlans('\ud800'));assert.throws(()=>gefyraPlans('x'.repeat(50001)));checks+=2;
const s='left middle right '.repeat(20)+'left right';check(s); // existing adjacent triggers must not silently acquire a word
let calls=0;const input='left middle right '.repeat(20);const r=gefyraFromFrontier(input,input,x=>x,()=>{calls++;return 'WRONG';},x=>x);assert.ok(r.tokens<=encode(input).length);assert.equal(r.applied?gefyraRead(r.message):r.message,input);assert.equal(calls,1);checks+=3;
fs.writeFileSync('bench/x169/receipts/screen.json',JSON.stringify({checks,exhaustiveSources:exhaustive,rows,native:'NOT_RUN'},null,2));fs.writeFileSync('bench/x169/receipts/unit-pairs.json',JSON.stringify(pairs));console.log({checks,pairs:pairs.length,sources:rows.length,exhaustiveSources:exhaustive,plans:rows.reduce((s,r)=>s+r.plans.length,0)});
