import fs from 'node:fs';import assert from 'node:assert/strict';import {undo,plans,families} from './portfolio';
const bad=[{family:'desmi',wire:'["a",[[0,2]],"~1;"]',p:{}},{family:'geiton',wire:'[[[1,0,0,"a"]],"~1;"]',p:{}},{family:'apousia',wire:'[1,[],"a b"]',p:{k:1}},{family:'diadochi',wire:'["a",null,[["b","c"]]]',p:{}},{family:'symfraz',wire:'1 2\n~',p:{k:1}},{family:'ropi',wire:'a b',p:{n:32,k:0}}];
for(const t of bad)assert.throws(()=>undo(t.wire,t.family,t.p));
const sources=['a a a a a a a a a a a a a a a a a a a a a a','a  b\r\n\t🙂 e\u0301 é\0','word ~1; ^ x 00001 99999','001 002 003\n001 002 003\n001 002 003\n','constructor __proto__ constructor __proto__'];let checks=bad.length;
for(const family of families)for(const source of sources)for(const p of plans(source,family)){assert.equal(undo(p.folded,family,p),source);checks++;}
// Contract logic tests, not claims that native or benchmark gates ran.
const obligations=['byteExact','allCostsPaid','twoProse','twoOps','heldout','moreThanTen','protected','nativeRun','nativeExact','novelty','runtimeMeasured','runtimeNonregression','unicodeExact','bounded','independentRead','noHiddenContext'];const good=Object.fromEntries(obligations.map(k=>[k,true]));const accept=(x:Record<string,boolean>)=>obligations.every(k=>x[k]===true);
assert.ok(accept(good));const negatives=obligations.map(k=>{const candidate={...good,[k]:false};assert.equal(accept(candidate),false);return {missing:k,accepted:accept(candidate)};});checks+=1+negatives.length;
fs.writeFileSync('bench/x186/receipts/adversary.json',JSON.stringify({checks,structural:bad.map(x=>x.family),negativeContractShapes:negatives,note:'Boolean gate checks are not empirical native verification.'},null,2));console.log({checks});
