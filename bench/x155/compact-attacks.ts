import fs from 'node:fs';import assert from 'node:assert/strict';import {stoibasCompactPlans,stoibasCompactUndo,stoibasCompactRead,stoibasCompactKey} from '../../src/lib/omega/stoibas';let checks=0;const rows=[];
for(const width of [1,2,4])for(const value of ['', '=', '[1', '{ a', '"', '\\', '\\u000a', '\u2028', '\u0085', 'null', '1e309']){
 const source=JSON.stringify({'a b':value,'true':value,'-5':value,'key"':value,'__proto__x':value},null,width)+'\n',p=stoibasCompactPlans(source).find(p=>p.width===width);assert.ok(p);assert.equal(stoibasCompactUndo(p.folded,width),source);assert.equal(stoibasCompactRead(stoibasCompactKey(width)+p.folded,s=>s),source);rows.push({source,folded:p.folded,width});checks+=3;
}
const source='{\n  "\\u0061": -0,\n  "a": 1e309,\n  "a": "\\ud800"\n}\n',p=stoibasCompactPlans(source)[0];assert.ok(p);assert.equal(stoibasCompactUndo(p.folded,p.width),source);rows.push({source,folded:p.folded,width:p.width});checks+=2;
for(const bad of ['{ a  b\n0\n0','{ "x"oops\n0','{ a\n=\\','{ a\n="','[2\n=onlyone','[0\n=orphan','{ a\n=literal\nextra']){assert.throws(()=>stoibasCompactUndo(bad,2));checks++;}
fs.writeFileSync('bench/x155/receipts/compact-attacks.json',JSON.stringify({checks,passed:true,rows},null,2));console.log({checks});
