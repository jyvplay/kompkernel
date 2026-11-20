import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {eutaxiaPlans,eutaxiaUndo} from '../../src/lib/omega/eutaxia';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const l of fs.readFileSync(process.argv[2]??'bench/x141/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l),text=fs.readFileSync(a.path,'utf8'),plans=eutaxiaPlans(text);
 // Predeclared policy: longest run, first nonidentity ordering only. No
 // source-name exception or post-outcome threshold fitting.
 for(const p of plans.slice(0,1)){
 const t=performance.now(),q=tagstackEncode(p.folded),ms=performance.now()-t;
 assert.equal(eutaxiaUndo(q.decoded,p.spec),text);const message=p.contract+q.message;
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:encode(message).length,ms,message,parentMessage:q.message,sourceExact:true,...p}));
 }
}
