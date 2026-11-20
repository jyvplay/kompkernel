/** Non-destructive audit after the failed cheap-repricing attempt.
 * If header price changes a selected model, a full parent rerun is necessary.
 * Historical messages live in *-before-lf-clarification.jsonl.
 */
import * as fs from 'node:fs';import assert from 'node:assert/strict';import {protasisPlans} from '../../src/lib/omega/protasis';
const changes=[];
for(const l of fs.readFileSync('bench/x143/receipts/parent-before-lf-clarification.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l),plans=protasisPlans(fs.readFileSync(a.path,'utf8'));
 const p=plans.filter(p=>p.changed>=8&&p.exceptions<=p.changed).sort((a,b)=>a.tokens-b.tokens)[0];assert.ok(p);
 if(p.mode!==a.mode)changes.push({path:a.path,before:a.mode,after:p.mode});
}
assert.deepEqual(changes,[{path:'bench/holdout-work/email-thread.txt',before:'line',after:'sentence'}]);
console.log(JSON.stringify({firstCheapRepriceAttempt:'REJECTED by selection guard',changes,requiresFullParentRerun:true,filesMutated:false},null,2));
