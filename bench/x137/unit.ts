import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {kremaPlan,kremaUndo,kremaParameters,kremaOverflowPlan,kremaOverflowUndo} from '../../src/lib/omega/krema';
let checks=0;
const sample='  item  alpha beta\n        gamma delta\n        epsilon zeta\n        eta theta';
for(const tail of ['', '\n','\n\n'])for(const width of [19,20,21]){
 const s=sample+tail,p=kremaPlan(s,width,8);if(p){assert.equal(kremaUndo(p.folded,width,8),s);checks++;}
 const q=kremaOverflowPlan(s,width,8);if(q){assert.equal(kremaOverflowUndo(q.folded,width,8,q.escapes>0),s);checks++;}
}
for(const s of ['', 'a','~|literal','a\r\nb','  label  αβ\n        γδ']){assert.equal(kremaPlan(s,20,8),null);checks++;}
for(const s of ['~|','x~|a~|b','stray~']){assert.throws(()=>kremaUndo(s,20,8));checks++;}
for(const [w,i]of [[0,0],[10,10],[20,-1],[NaN,0],[161,2]]){assert.throws(()=>kremaUndo('abc',w,i));checks++;}
assert.throws(()=>kremaOverflowUndo('a'.repeat(30),20,8,false));checks++;
assert.throws(()=>kremaOverflowUndo('~|literal',20,8,false));checks++;
// Patch attack: a pre-existing long literal must not be accidentally wrapped.
const long='  literal  this is deliberately a long untouched original line';
const escaped=kremaOverflowPlan(sample+'\n'+long,20,8)!;
assert.ok(escaped&&escaped.escapes===1);assert.equal(kremaOverflowUndo(escaped.folded,20,8,true),sample+'\n'+long);checks+=2;
const raw=sample+'\n'+long;
assert.notEqual(kremaOverflowUndo(escaped.folded.replace('~|',''),20,8,false),raw);checks++;
for(const file of fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n')){
 const s=fs.readFileSync(file,'utf8');const params=kremaParameters(s);assert.ok(params.length<=3);checks++;
 for(const p of params){const a=kremaPlan(s,p.width,p.indent)!;assert.equal(kremaUndo(a.folded,p.width,p.indent),s);checks++;
 const b=kremaOverflowPlan(s,p.width,p.indent)!;assert.equal(kremaOverflowUndo(b.folded,p.width,p.indent,b.escapes>0),s);checks++;}
}
console.log(JSON.stringify({checks,scope:'exact mechanics and adversarial inputs, not native model evidence'}));
