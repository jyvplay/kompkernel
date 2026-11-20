import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {protasisPlans,protasisUndo} from '../../src/lib/omega/protasis';
let checks=0;for(const name of ['probe','parent','heldout-probe','heldout-parent'])for(const l of fs.readFileSync(`bench/x143/receipts/${name}.jsonl`,'utf8').trim().split('\n').filter(Boolean)){
 const a=JSON.parse(l),text=fs.readFileSync(a.path,'utf8'),plans=protasisPlans(text);
 if(!('B'in a)){assert.equal(plans.length,0);checks++;continue;}
 const p=plans.find(p=>p.mode===a.mode);assert.ok(p);assert.equal(p.folded,a.folded);assert.equal(p.contract,a.contract);assert.equal(protasisUndo(p.folded,p.mode),text);checks+=3;
}
console.log(JSON.stringify({checks,allPriorCandidateRepresentationsUnchanged:true,fullParentRerun:false}));
