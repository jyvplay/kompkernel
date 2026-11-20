import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {ptychePlan,ptycheUndo,ptycheFromFrontier,ptycheDefaultPlan,ptycheDefaultUndo,ptycheWidth,ptycheDefaultFromFrontier} from '../../src/lib/omega/ptyche';
import {readParent} from '../x135/reader';
let checks=0;
for(const p of ['', '\n','\n\n','a\n','a\n\n','α🙂\nβ\n','a\r\nb\r\n','↵literal','two  spaces\nnext\nlast']){
 const plan=ptychePlan(p);if(plan)assert.equal(ptycheUndo(plan.folded),p);checks++;
}
for(const bad of ['↵0|a b','↵3/1:0|a b','↵3/1:-3|a b','↵3/1:4|a b','↵3/7:1|a b','↵3/1:1,1:2|a b','↵3|a  b','↵3|a\nb']){assert.throws(()=>ptycheUndo(bad));checks++;}
assert.equal(ptycheUndo('↵5/1:-1|aa bb cc dd ee'),'aa\nbb cc\ndd ee');checks++;
assert.equal(ptycheUndo('↵5/1:1|aa bb cc dd ee\n'),'aa bb cc\ndd ee\n');checks++;
assert.equal(ptycheUndo('↵5|aa bb cc\n\nplain\n'),'aa bb\ncc\n\nplain\n');checks++;
for(const path of fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n')){
 const s=fs.readFileSync(path,'utf8');for(const patches of [0,3]){const p=ptychePlan(s,'o200k_base',patches);if(p)assert.equal(ptycheUndo(p.folded),s);checks++;}
}
const source=fs.readFileSync('bench/holdout-work/kb-article.txt','utf8');
assert.ok(ptychePlan(source));checks++;
let decodedCalls=0;
assert.equal(ptycheFromFrontier(source,'large baseline '.repeat(2000),s=>s,()=> {decodedCalls++;return 'corrupt';}),null);checks++;
assert.equal(decodedCalls,1);checks++; // prevent the price gate from masking the attack
const eligible=ptycheFromFrontier(source,'large baseline '.repeat(2000),s=>s,s=>s);
assert.ok(eligible);checks++; // constructed admission test, NOT a real-lane saving
// Targeted final-LF repair attack: byte-preserve every trailing-LF multiplicity.
for(let n=0;n<5;n++){const s=source.trimEnd()+'\n'.repeat(n),p=ptychePlan(s);assert.ok(p);assert.equal(ptycheUndo(p!.folded),s);checks+=2;}
for(let w=40;w<=160;w++){const p=ptycheDefaultPlan(source,w);assert.ok(p);assert.equal(ptycheDefaultUndo(p!.folded,w),source);checks+=2;}
for(const s of ['~bad','x~|words','~0|words','~|two  spaces','↵98|words']){assert.throws(()=>ptycheDefaultUndo(s,98));checks++;}
assert.equal(ptycheDefaultPlan('literal~\n'+source,98),null);checks++;
assert.throws(()=>ptycheDefaultUndo('plain',0));checks++;
for(let n=0;n<5;n++){const s=source.trimEnd()+'\n'.repeat(n),p=ptycheDefaultPlan(s,98);assert.ok(p);assert.equal(ptycheDefaultUndo(p!.folded,98),s);checks+=2;}
assert.equal(ptycheWidth(source),98);checks++;
for(const l of fs.readFileSync('bench/x136/receipts/default-layout.jsonl','utf8').trim().split('\n')){
 const row=JSON.parse(l),s=fs.readFileSync(row.path,'utf8');
 const base=fs.readFileSync('bench/x136/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)).find(x=>x.path===row.path);
 const parent='¶ k=v. expand repeatedly; print only.\n'+row.message.slice(row.message.indexOf('\n')+1);
 const result=ptycheDefaultFromFrontier(s,base.message,folded=>{assert.equal(folded,row.folded);return parent;},readParent);
 assert.equal(!!result,row.admitted);checks++;
 if(result){assert.equal(result.message,row.message);assert.equal(result.tokens,row.B);checks+=2;}
 let count=0;
 assert.equal(ptycheDefaultFromFrontier(s,'large baseline '.repeat(2000),()=>parent,()=>{count++;return 'corrupt';}),null);checks++;
 assert.equal(count,1);checks++;
 assert.equal(ptycheDefaultFromFrontier(s,'large baseline '.repeat(2000),()=>parent,()=>{throw Error('malformed parent');}),null);checks++;
}
console.log(JSON.stringify({checks,scope:'mechanics and source equality, not native-model verification'}));
