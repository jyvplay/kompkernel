import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {countTokens} from '../../src/lib/omega/bpe';
import {ptycheDefaultPlan,ptycheDefaultUndo,ptycheWidth,ptycheDefaultKey,ptycheDefaultFromFrontier} from '../../src/lib/omega/ptyche';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {readParent} from '../x135/reader';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const line of fs.readFileSync('bench/x136/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),width=ptycheWidth(a.text);if(width===null)continue;
 const plan=ptycheDefaultPlan(a.text,width);if(!plan)continue;
 const t=performance.now(),parent=tagstackEncode(plan.folded,'o200k_base'),ms=performance.now()-t;
 const inner=readParent(parent.message);assert.equal(ptycheDefaultUndo(inner,width),a.text);
 const pre='¶ k=v. expand repeatedly; print only.\n';if(!parent.message.startsWith(pre))continue;
 const key=ptycheDefaultKey(width),message=key+parent.message.slice(pre.length);
 assert.equal(encode(message).length,ct(message));
 const admitted=ptycheDefaultFromFrontier(a.text,a.message,s=>{assert.equal(s,plan.folded);return parent.message;},readParent);
 assert.equal(!!admitted,ct(message)<a.tokens);
 if(admitted)assert.equal(admitted.message,message);
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:ct(message),delta:ct(message)-a.tokens,width,admitted:!!admitted,sourceExact:true,ms,...plan,message}));
}
