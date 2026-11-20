import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';import {psifidaPlans,psifidaUndo} from '../../src/lib/omega/psifida';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of ['bench/x144/heldout/vite.md','bench/x144/heldout/drizzle.md','bench/x144/heldout/git-log.txt']){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),a=tagstackEncode(text);assert.equal(a.decoded,text);
 fs.appendFileSync('bench/x144/receipts/heldout-baseline.jsonl',JSON.stringify({path,text,message:a.message,tokens:a.messageTokens,ms:performance.now()-t})+'\n');
 const plans=psifidaPlans(text);for(const p of plans){assert.equal(psifidaUndo(p.folded),text);fs.appendFileSync('bench/x144/receipts/heldout-probe.jsonl',JSON.stringify({path,A:a.messageTokens,B:p.tokens,...p})+'\n');}
 // Predeclared budget: one best standalone plan per heldout source.
 const p=plans.sort((a,b)=>a.tokens-b.tokens)[0];if(!p)continue;
 const start=performance.now(),q=tagstackEncode(p.folded),message=p.contract+q.message;assert.equal(psifidaUndo(q.decoded),text);
 fs.appendFileSync('bench/x144/receipts/heldout-parent.jsonl',JSON.stringify({path,A:a.messageTokens,B:encode(message).length,ms:performance.now()-start,...p,message,parentMessage:q.message})+'\n');
}
