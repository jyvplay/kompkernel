import fs from 'node:fs';import assert from 'node:assert/strict';import {stoibasCompactPlans,stoibasCompactUndo} from '../../src/lib/omega/stoibas';let checks=0;
for(const width of [1,2,4])for(let n=0;n<100;n++){
 const source=JSON.stringify({a:Array.from({length:n%20},(_,i)=>({i,s:'{12 [0 \\" 🚀\u2028',a:[true,false,null,{},[]]})),b:n},null,width)+'\n';const p=stoibasCompactPlans(source).find(p=>p.width===width);assert.ok(p);assert.equal(stoibasCompactUndo(p.folded,width),source);checks+=2;
}
const lexical='{\n  "x": 1e309,\n  "x": -0,\n  "a": "\\u0061",\n  "__proto__": {\n    "01": true\n  }\n}\n';const p=stoibasCompactPlans(lexical)[0];assert.ok(p);assert.equal(stoibasCompactUndo(p.folded,p.width),lexical);checks+=2;
for(const source of [lexical.replace(/\n/g,'\r\n'),lexical.slice(0,-1),lexical+'\ud800','[1,2,3]\n','['.repeat(130)+'0'+']'.repeat(130)]){assert.equal(stoibasCompactPlans(source).length,0);checks++;}
for(const bad of ['{ "a"','[2\n1','[1\n1\n2','[01\n1','[10001','"unterminated','1e','NaN','{ "a"\n{ "b"']){assert.throws(()=>stoibasCompactUndo(bad,2));checks++;}
fs.writeFileSync('bench/x155/receipts/compact-unit.json',JSON.stringify({checks,passed:true})+'\n');console.log({checks});
