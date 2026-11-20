import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {mnemaPlan,mnemaUndo,MNEMA_COMPOSE_KEY} from '../../src/lib/omega/mnema';
import {readParent} from '../x135/reader';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const rows=fs.readFileSync(process.argv[2]??'bench/x140/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
rows.sort((a,b)=>Number(!/kb-article|node-help|email-thread|llm-answer/.test(a.path))-Number(!/kb-article|node-help|email-thread|llm-answer/.test(b.path)));
for(const a of rows){
 const text=fs.readFileSync(a.path,'utf8'),seen=new Set<string>();
 for(const threshold of (/kb-article|node-help|email-thread|llm-answer|x141\/heldout/.test(a.path)?[1,0]:[1])){
  const t=performance.now(),p=mnemaPlan(text,threshold);if(!p||seen.has(p.folded))continue;seen.add(p.folded);
  const planningMs=performance.now()-t,q=performance.now(),parent=tagstackEncode(p.folded),parentMs=performance.now()-q;
  assert.equal(mnemaUndo(parent.decoded),text);
  const message=MNEMA_COMPOSE_KEY+parent.message;let sharedReaderExact=false;
  if(parent.message===p.folded||['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(s=>parent.message.startsWith(s+'§'))){assert.equal(mnemaUndo(readParent(parent.message)),text);sharedReaderExact=true;}
  console.log(JSON.stringify({path:a.path,threshold,A:a.tokens,B:encode(message).length,sites:p.sites,planningMs,parentMs,sourceExact:true,sharedReaderExact,message,parentMessage:parent.message,folded:p.folded}));
 }
}
