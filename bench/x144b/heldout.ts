import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';import {colexPlans,colexUndo} from '../../src/lib/omega/colex';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of ['bench/x144b/heldout/clsx.md','bench/x144b/heldout/npm-ls.txt']){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),a=tagstackEncode(text);assert.equal(a.decoded,text);
 fs.appendFileSync('bench/x144b/receipts/heldout-baseline.jsonl',JSON.stringify({path,text,message:a.message,tokens:a.messageTokens,ms:performance.now()-t})+'\n');
 const plans=colexPlans(text);for(const p of plans){assert.equal(colexUndo(p.folded,p.sep),text);fs.appendFileSync('bench/x144b/receipts/heldout-probe.jsonl',JSON.stringify({path,A:a.messageTokens,B:p.tokens,...p})+'\n');}
 // Predeclared budget: one best standalone plan per heldout source.
 const p=plans.sort((a,b)=>a.tokens-b.tokens)[0];if(!p)continue;
 const start=performance.now(),q=tagstackEncode(p.folded),message=p.contract+q.message;assert.equal(colexUndo(q.decoded,p.sep),text);
 fs.appendFileSync('bench/x144b/receipts/heldout-parent.jsonl',JSON.stringify({path,A:a.messageTokens,B:encode(message).length,ms:performance.now()-start,...p,message,parentMessage:q.message})+'\n');
}
