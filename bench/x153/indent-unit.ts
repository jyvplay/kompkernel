import fs from 'node:fs';import assert from 'node:assert/strict';import {kenomaIndentPlans,kenomaIndentUndo} from '../../src/lib/omega/kenoma';let checks=0;
for(const width of [1,2,4])for(let n=1;n<=60;n++){
 const s=JSON.stringify({a:Array.from({length:n},(_,i)=>({i,quote:'"}]\\',a:[null,{z:i}],empty:{}})),b:[1,2],last:{}},null,width)+'\n';const p=kenomaIndentPlans(s).find(p=>p.width===width);assert.ok(p);assert.equal(kenomaIndentUndo(p.folded,width),s);checks+=2;
}
const lexical='{\n  "x":1e309,\n  "x":-0,\n  "s":"\\u0061",\n  "a": [\n    {\n      "q": "} ]"\n    },\n    {}\n  ]\n}\n';const p=kenomaIndentPlans(lexical)[0];assert.ok(p);assert.equal(kenomaIndentUndo(p.folded,p.width),lexical);checks+=2;
for(const bad of [lexical.replace(/\n/g,'\r\n'),lexical.slice(0,-1),lexical+'\ud800','{\n\n}\n','['.repeat(129)+'\n'+']'.repeat(129)+'\n']){assert.equal(kenomaIndentPlans(bad).length,0);checks++;}
fs.writeFileSync('bench/x153/receipts/indent-unit.json',JSON.stringify({checks,passed:true}));console.log({checks});
