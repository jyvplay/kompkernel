import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {apotomeTrial} from '../../src/lib/omega/apotome';
import {steliUndo} from '../../src/lib/omega/steli';
import {kremaParameters,kremaOverflowPlan,kremaOverflowUndo,kremaOverflowKey} from '../../src/lib/omega/krema';
import {readParent} from '../x135/reader';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const {path}of JSON.parse(fs.readFileSync('bench/x139/receipts/heldout-policy.json','utf8')).rows){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),base=tagstackEncode(text),baselineMs=performance.now()-t;assert.equal(base.decoded,text);
 fs.appendFileSync('bench/x139/receipts/heldout-baseline.jsonl',JSON.stringify({path,text,message:base.message,tokens:encode(base.message).length,ms:baselineMs})+'\n');
 const start=performance.now(),r=apotomeTrial(base.message);if(r)assert.equal(steliUndo(r.target),text);
 console.log(JSON.stringify({path,kind:'APOTOME',A:base.messageTokens,B:r?.tokens,eligible:!!r,baselineMs,ms:performance.now()-start,...r}));
 const param=kremaParameters(text)[0],plan=param&&kremaOverflowPlan(text,param.width,param.indent);
 if(!plan){console.log(JSON.stringify({path,kind:'existing-KREMA',eligible:false}));continue;}
 const now=performance.now(),parent=tagstackEncode(plan.folded),ms=performance.now()-now;
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>parent.message.startsWith(p+'§'));
 if(!pre){console.log(JSON.stringify({path,kind:'existing-KREMA',unsupportedParent:true,ms}));continue;}
 const message=kremaOverflowKey(plan.width,plan.indent,plan.escapes>0)+parent.message.slice(pre.length);
 assert.equal(kremaOverflowUndo(readParent(parent.message),plan.width,plan.indent,plan.escapes>0),text);
 console.log(JSON.stringify({path,kind:'existing-KREMA',A:base.messageTokens,B:encode(message).length,sourceExact:true,ms,message}));
}
