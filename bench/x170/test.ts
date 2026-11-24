import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';import {kyklosPlans,kyklosUndo,kyklosRead,kyklosFromFrontier} from '../../src/lib/omega/kyklos';
let checks=0;const pairs:any[]=[],rows:any[]=[];
function check(s:string,save=false){for(const p of kyklosPlans(s)){assert.ok(Buffer.from(kyklosRead(p.message)).equals(Buffer.from(s)));assert.equal(encode(p.message).length,p.tokens);assert.equal(decode(encode(p.message)),p.message);checks+=3;if(save)pairs.push({source:s,folded:p.folded});}}
const paths=[...fs.readFileSync('bench/x170/lanes.txt','utf8').trim().split('\n'),...fs.readdirSync('bench/x165/fixtures').map(n=>'bench/x165/fixtures/'+n),...JSON.parse(fs.readFileSync('bench/x168/receipts/heldout-sources.json','utf8')).map((r:any)=>r.file),...JSON.parse(fs.readFileSync('bench/x170/receipts/heldout-sources.json','utf8')).map((r:any)=>r.file)];
for(const path of paths){const b=fs.readFileSync(path),s=b.toString();assert.ok(Buffer.from(s).equals(b));check(s);rows.push({path,raw:encode(s).length,plans:kyklosPlans(s)});}
let seed=170;function rand(n:number){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
const atoms=['alpha','beta','gamma','','\r\n','😀','é','__proto__','Q','"'];for(let i=0;i<1000;i++){const a=[];for(let j=0,n=20+rand(120);j<n;j++)a.push(atoms[rand(i%2?atoms.length:3)]);check(a.join(' '),true);}
let exhaustive=0;for(let n=1;n<=8;n++)for(let k=0;k<3**n;k++){let v=k;const a=[];for(let i=0;i<n;i++){a.push(['a','b','c'][v%3]);v=Math.floor(v/3);}check(a.join(' '),true);exhaustive++;}
assert.equal(kyklosUndo('[["Q",["a","b"]],["Z",["c","d"]]]\nQ Z Q Z Q'),'a c b d a');
assert.equal(kyklosUndo('[["Q",["Z","word"]],["Z",["a","b"]]]\nQ Z Q Z'),'Z a word b');checks+=2;
assert.equal(kyklosUndo('[["Q",["alpha","beta"]]]\nQ alpha Q beta Q'),'alpha alpha beta beta alpha');checks++;
assert.ok(kyklosPlans(('alpha alpha beta beta ').repeat(20)).length>0);checks++;
for(const f of ['[]\nQ','[["Q",["a"]]]\nQ','[["Q",["a","b"]],["Q",["c","d"]]]\nQ','[["Q",["a b","c"]]]\nQ','[["Q",[1,"c"]]]\nQ',JSON.stringify([['Q',['a'.repeat(1000),'b'.repeat(1000)]]])+'\n'+'Q '.repeat(60)]){assert.throws(()=>kyklosUndo(f));checks++;}
assert.throws(()=>kyklosPlans('\ud800'));assert.throws(()=>kyklosPlans('x'.repeat(50001)));checks+=2;
for(const s of ['alpha beta '.repeat(30)+'alpha alpha','Q alpha beta '.repeat(30),'alpha β beta\r\n'.repeat(30),'alpha beta gamma '.repeat(30)])check(s,true);
let calls=0;const input='alpha beta '.repeat(30);const r=kyklosFromFrontier(input,input,x=>x,()=>{calls++;return 'WRONG';},x=>x);assert.ok(r.tokens<=encode(input).length);assert.equal(r.applied?kyklosRead(r.message):r.message,input);assert.equal(calls,1);checks+=3;
// Decoder-only generation exercises cycles even when planner has no candidate.
for(let trial=0;trial<5000;trial++){
 const cycles=[['alpha','beta'],['left','middle','right'],['red','blue','green','gold']],markers=['Q','Z','X'],cursor=[0,0,0];let body='',expected='';
 for(let j=0,n=1+rand(80);j<n;j++){const k=rand(4),sep=[' ','\r\n','😀','_','  ','é'][rand(6)];body+=sep+(k<3?markers[k]:'literal');expected+=sep+(k<3?cycles[k][cursor[k]++%cycles[k].length]:'literal');}
 const folded=JSON.stringify(markers.map((m,i)=>[m,cycles[i]]))+'\n'+body;assert.equal(kyklosUndo(folded),expected);assert.equal(kyklosUndo(folded),expected);checks+=2;pairs.push({source:expected,folded});
}
fs.writeFileSync('bench/x170/receipts/screen.json',JSON.stringify({checks,exhaustiveSources:exhaustive,rows,native:'NOT_RUN'},null,2));fs.writeFileSync('bench/x170/receipts/unit-pairs.json',JSON.stringify(pairs));console.log({checks,pairs:pairs.length,sources:rows.length,exhaustiveSources:exhaustive,plans:rows.reduce((s,r)=>s+r.plans.length,0)});
