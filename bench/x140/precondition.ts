/** Representation control: a source-alphabet involution, NOT grammar relabeling.
 * All source characters including both sides of the swap are transformed once.
 * Decode the ordinary parent fully, then invert. No omission or semantics guess.
 * This is a control experiment on representation, not claimed new mathematics.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {readParent} from '../x135/reader';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
export const swap=(s:string,pair:string)=>[...s].map(c=>c===pair[0]?pair[1]:c===pair[1]?pair[0]:c).join('');
const key=(pair:string)=>`Decode the following payload completely, then simultaneously swap every ${JSON.stringify(pair[0])} and ${JSON.stringify(pair[1])}. Print only.\n`;
const rows=fs.readFileSync(process.argv[2]??'bench/x139/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const a of rows){
 const source=fs.readFileSync(a.path,'utf8'),plans=['-_','./','_ ','- ','. ',',;'].map(pair=>({pair,text:swap(source,pair)})).filter(p=>p.text!==source).map(p=>({...p,rawTokens:encode(p.text).length,headerTokens:encode(key(p.pair)).length})).sort((a,b)=>a.rawTokens+a.headerTokens-b.rawTokens-b.headerTokens);
 fs.appendFileSync('bench/x140/receipts/precondition-screen.jsonl',JSON.stringify({path:a.path,A:a.tokens,sourceTokens:encode(source).length,plans:plans.map(({text,...p})=>p)})+'\n');
 if(!/kb-article|node-help|email-thread|llm-answer|x140\/heldout/.test(a.path))continue;
 for(const plan of plans.slice(0,2)){
  const t=performance.now(),parent=tagstackEncode(plan.text),ms=performance.now()-t;
  assert.equal(swap(parent.decoded,plan.pair),source);
  let independent=false;try{assert.equal(swap(readParent(parent.message),plan.pair),source);independent=true;}catch{}
  const message=key(plan.pair)+parent.message;
  console.log(JSON.stringify({path:a.path,pair:plan.pair,A:a.tokens,B:encode(message).length,ms,sourceExact:true,independent,rawTokens:plan.rawTokens,message,parentMessage:parent.message}));
 }
}
