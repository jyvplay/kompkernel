import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {readParent as decode} from './reader';
import {countTokens} from '../../src/lib/omega/bpe';
import {anakykliCuts,anakykliPlan,anakykliLineFold,ANAKYKLI_LINE_KEY,anakykliKey,anakykliDecode} from '../../src/lib/omega/anakykli';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const base=new Map(fs.readFileSync('bench/x135/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return[r.path,r]}));
const selected=[...base.values()].filter((r:any)=>/kb-article|email-thread|llm-answer|node-help|code-ts|ps-aux-real|ls-real.txt/.test(r.path)) as any[];
const start=Number(process.env.CUT_START??0);
const out=fs.openSync('bench/x135/receipts/rotation.jsonl',start>0?'a':'w');
for(const a of selected){
 const text=fs.readFileSync(a.path,'utf8');assert.equal(text,a.text);
 const cuts=anakykliCuts(text).slice(start,start+Number(process.env.CUTS??2));
 for(const cut of cuts){
  const plan=anakykliPlan(text,cut)!;
  const line=cut===text.indexOf('\n')+1?anakykliLineFold(text):null;
  const folded=line??plan.folded,key=line!==null?ANAKYKLI_LINE_KEY:anakykliKey(plan.marker);
  const t=Date.now(),parent=tagstackEncode(folded,'o200k_base'),ms=Date.now()-t;
  const message=key+parent.message,tokens=countTokens(message,'o200k_base');
  let exact=false;try{exact=anakykliDecode(message,decode)===text;}catch{}
  const row={path:a.path,cut,lineMode:line!==null,A:a.tokens,B:tokens,delta:tokens-a.tokens,ms,exact,message};
  fs.writeSync(out,JSON.stringify(row)+'\n');console.log(JSON.stringify({...row,message:undefined}));
 }
}
