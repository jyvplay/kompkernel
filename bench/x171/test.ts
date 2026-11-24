import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';import {metridaPlans,metridaUndo,metridaRead,metridaFromFrontier} from '../../src/lib/omega/metrida';
let checks=0;const pairs:any[]=[],rows:any[]=[];
function check(s:string,save=false){for(const p of metridaPlans(s)){assert.ok(Buffer.from(metridaRead(p.message)).equals(Buffer.from(s)));assert.equal(encode(p.message).length,p.tokens);assert.equal(decode(encode(p.message)),p.message);checks+=3;if(save)pairs.push({source:s,folded:p.folded});}}
const paths=[...fs.readFileSync('bench/x171/lanes.txt','utf8').trim().split('\n'),...fs.readdirSync('bench/x165/fixtures').map(n=>'bench/x165/fixtures/'+n),...JSON.parse(fs.readFileSync('bench/x170/receipts/heldout-sources.json','utf8')).map((r:any)=>r.file)];
for(const path of paths){const b=fs.readFileSync(path),s=b.toString();assert.ok(Buffer.from(s).equals(b));check(s);rows.push({path,raw:encode(s).length,plans:metridaPlans(s)});}
let seed=171;function rand(n:number){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
const atoms=['a','bb','ccc','longword','','\r\n','😀','é','Q'];for(let i=0;i<1000;i++){const a=[];for(let j=0,n=15+rand(90);j<n;j++)a.push(atoms[rand(atoms.length)]);check(a.join(' '),true);}
let exhaustive=0;for(let n=1;n<=7;n++)for(let k=0;k<3**n;k++){let v=k;const a=[];for(let i=0;i<n;i++){a.push(['a','bb','ccc'][v%3]);v=Math.floor(v/3);}check(a.join(' '),true);exhaustive++;}
// Independent enumeration oracle preserves order, NOT just the multiset of lengths.
for(let a=1;a<=5;a++)for(let b=1;b<=5;b++)if(a!==b)for(let sites=1;sites<=8;sites++){
 const rules=[['Q','a'.repeat(a),'b'.repeat(b)]],possible=new Map<number,string[]>();
 function walk(n:number,words:string[]){if(n===sites){const sum=words.join('').length;possible.set(sum,[...(possible.get(sum)??[]),words.join(' ')]);return;}for(const w of rules[0].slice(1))walk(n+1,[...words,w]);}walk(0,[]);
 for(let sum=0;sum<=5*sites;sum++){const folded=JSON.stringify(rules)+'\n~'+sum+':'+Array(sites).fill('Q').join(' '),solutions=possible.get(sum)??[];if(solutions.length===1){assert.equal(metridaUndo(folded),solutions[0]);pairs.push({source:solutions[0],folded});}else assert.throws(()=>metridaUndo(folded));checks++;}
}
for(const folded of ['[]\nx','[["Q","a","b"]]\n~1:Q','[["Q","a","bb"],["Q","c","ddd"]]\n~1:Q','[["Q","a","bb"]]\n~3:Q Q','[["Q","a","bb"]]\n~9:Q Q Q Q Q Q Q Q Q','[["Q","a","bb"]]\n~01:Q','[["Q","a","bb"]]\n~1:']){assert.throws(()=>metridaUndo(folded));checks++;}
assert.equal(metridaUndo('[["Q","Z","abcd"],["Z","b","ccc"]]\n~1:Q'),'Z');checks++;
assert.equal(metridaUndo('[["Q","a","bb"],["Z","c","ddd"]]\n~4:Q 😀 Z\r\nliteral'),'a 😀 ddd\r\nliteral');checks++;
assert.deepEqual(metridaPlans('literal ~ marker'),[]);assert.throws(()=>metridaPlans('\ud800'));assert.throws(()=>metridaPlans('a'.repeat(50001)));checks+=3;
let calls=0;const input='alpha beta\n'.repeat(30);const r=metridaFromFrontier(input,input,x=>x,()=>{calls++;return 'WRONG';},x=>x);assert.ok(r.tokens<=encode(input).length);assert.equal(r.applied?metridaRead(r.message):r.message,input);assert.equal(calls,1);checks+=3;
fs.writeFileSync('bench/x171/receipts/screen.json',JSON.stringify({checks,exhaustiveSources:exhaustive,rows,native:'NOT_RUN'},null,2));fs.writeFileSync('bench/x171/receipts/unit-pairs.json',JSON.stringify(pairs));console.log({checks,pairs:pairs.length,sources:rows.length,exhaustiveSources:exhaustive,plans:rows.reduce((s,r)=>s+r.plans.length,0)});
