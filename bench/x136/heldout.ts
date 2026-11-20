import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {ptycheDefaultFromFrontier} from '../../src/lib/omega/ptyche';
import {readParent} from '../x135/reader';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const line of fs.readFileSync('bench/x136/receipts/heldout-screen.jsonl','utf8').trim().split('\n')){
 const row=JSON.parse(line);if(!row.eligible)continue;
 const text=fs.readFileSync(row.path,'utf8'),t=performance.now(),base=tagstackEncode(text,'o200k_base');
 assert.equal(base.decoded,text);let parentCalls=0;
 const candidate=ptycheDefaultFromFrontier(text,base.message,s=>{parentCalls++;return tagstackEncode(s,'o200k_base').message;},readParent);
 console.log(JSON.stringify({path:row.path,A:base.messageTokens,B:candidate?.tokens??base.messageTokens,admitted:!!candidate,parentCalls,ms:performance.now()-t,baselineSourceAudit:'inherited decoded only; candidate gate uses message reader',candidate}));
}
