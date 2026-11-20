import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {synapheTrial} from '../../src/lib/omega/synaphe';
import {kremaParameters,kremaOverflowPlan,kremaOverflowKey,kremaOverflowUndo} from '../../src/lib/omega/krema';
import {wrapEncode,wrapDecode} from '../../src/lib/omega/wrapcanon';
import {readParent} from '../x135/reader';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const row of JSON.parse(fs.readFileSync('bench/x138/receipts/heldout-policy.json','utf8')).rows){
 const text=fs.readFileSync(row.path,'utf8'),t=performance.now(),base=tagstackEncode(text),baselineMs=performance.now()-t;
 assert.equal(base.decoded,text);fs.appendFileSync('bench/x138/receipts/heldout-baseline.jsonl',JSON.stringify({path:row.path,text,message:base.message,tokens:encode(base.message).length,ms:baselineMs})+'\n');
 const A=encode(base.message).length;
 for(const overlap of [false,true]){const t=performance.now(),r=synapheTrial(base.message,'o200k_base',overlap);console.log(JSON.stringify({path:row.path,kind:overlap?'SYNAPHE':'concat',A,B:r?.tokens??A,eligible:!!r,ms:performance.now()-t,layerExact:r?.layerExact,...(r?{message:r.message,target:r.target}:{})}));}
 const p=kremaParameters(text)[0];if(!p){console.log(JSON.stringify({path:row.path,kind:'KREMA',eligible:false}));continue;}
 const folded=kremaOverflowPlan(text,p.width,p.indent);if(!folded)continue;
 const old=wrapEncode(text,p.width,'~');
 for(const kind of ['KREMA','WRAPCANON']){
  const data=kind==='KREMA'?folded.folded:old;if(data===null)continue;
  const undo=(s:string)=>kind==='KREMA'?kremaOverflowUndo(s,p.width,p.indent,folded.escapes>0):wrapDecode(s,p.width,'~');assert.equal(undo(data),text);
  const t=performance.now(),parent=tagstackEncode(data),ms=performance.now()-t;
  const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>parent.message.startsWith(p+'§'));
  if(!pre){console.log(JSON.stringify({path:row.path,kind,unsupportedParent:true,ms}));continue;}
  const key=kind==='KREMA'?kremaOverflowKey(p.width,p.indent,folded.escapes>0):`¶ k=v; expand recursively. In single-line paragraphs, remove initial ~; otherwise greedy-wrap to ${p.width} columns. Print only.\n`;
  const message=key+parent.message.slice(pre.length),sourceExact=undo(readParent(parent.message))===text;
  console.log(JSON.stringify({path:row.path,kind,A,B:encode(message).length,width:p.width,indent:p.indent,baselineMs,ms,sourceExact,message}));
 }
}
