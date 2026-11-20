/** Actual public candidate API after same-process full baseline computation. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {kremaFromFrontier,kremaOverflowUndo} from '../../src/lib/omega/krema';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {readParent} from '../x135/reader';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of ['bench/holdout-x41/node-help.txt','bench/holdout-work/llm-answer.md']){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),base=tagstackEncode(text,'o200k_base'),baselineMs=performance.now()-t;
 const start=performance.now();let parentCalls=0;
 const c=kremaFromFrontier(text,base.message,s=>{parentCalls++;return tagstackEncode(s,'o200k_base').message;},readParent);
 const extensionMs=performance.now()-start,message=c?.message??base.message;
 assert.equal(encode(message).length,c?.tokens??base.messageTokens);
 if(c){const parent='¶ k=v. expand repeatedly; print only.\n'+message.slice(message.indexOf('\n')+1);assert.equal(kremaOverflowUndo(readParent(parent),c.width,c.indent),text);}
 console.log(JSON.stringify({path,A:base.messageTokens,B:c?.tokens??base.messageTokens,admitted:!!c,baselineMs,extensionMs,totalMs:baselineMs+extensionMs,parentCalls,width:c?.width,message}));
}
