import fs from 'node:fs';import assert from 'node:assert/strict';import {arkesisPlans,arkesisUndo} from '../../src/lib/omega/arkesis';let checks=0;
for(const width of [1,2,4])for(let n=0;n<100;n++){
 const source=JSON.stringify({a:Array.from({length:n%20},(_,i)=>({i,s:'{12 [0 \\" 🚀\u2028',a:[true,false,null,{},[]]})),b:n},null,width)+'\n';const p=arkesisPlans(source).find(p=>p.width===width);assert.ok(p);assert.equal(arkesisUndo(p.folded,width),source);checks+=2;
}
const lexical='{\n  "x": 1e309,\n  "x": -0,\n  "a": "\\u0061",\n  "__proto__": {\n    "01": true\n  }\n}\n';const p=arkesisPlans(lexical)[0];assert.ok(p);assert.equal(arkesisUndo(p.folded,p.width),lexical);checks+=2;
for(const source of [lexical.replace(/\n/g,'\r\n'),lexical.slice(0,-1),lexical+'\ud800','[1,2,3]\n','['.repeat(130)+'0'+']'.repeat(130)]){assert.equal(arkesisPlans(source).length,0);checks++;}
for(const bad of ['{1 "a":','[2 1','[1 1 2','[01 1','[10001','{1 true:1','[1 "unterminated','[1 1e','{1 "a": NaN','[1 [1 [10000']){assert.throws(()=>arkesisUndo(bad,2));checks++;}
fs.writeFileSync('bench/x154/receipts/unit.json',JSON.stringify({checks,passed:true})+'\n');console.log({checks});
