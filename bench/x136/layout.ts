import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {countTokens} from '../../src/lib/omega/bpe';
import {ptychePlan,ptycheUndo,PTYCHE_KEY} from '../../src/lib/omega/ptyche';
import {readParent} from '../x135/reader';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const line of fs.readFileSync('bench/x136/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),plan=ptychePlan(a.text);if(!plan)continue;
 const t=performance.now(),parent=tagstackEncode(plan.folded,'o200k_base'),ms=performance.now()-t;
 const message=PTYCHE_KEY+parent.message,decoded=ptycheUndo(readParent(parent.message));
 assert.equal(decoded,a.text);
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:countTokens(message,'o200k_base'),delta:countTokens(message,'o200k_base')-a.tokens,sourceExact:true,ms,...plan,message}));
}
