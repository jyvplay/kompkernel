/** Isolated, deterministic AB/BA runs after the frontier/heldout processes exit.
 * Both arms recompute the full parent. Includes rejected candidate work.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {apotomeFromFrontier} from '../../src/lib/omega/apotome';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const old=new Map(fs.readFileSync('bench/x139/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return[r.path,r.message]}));
for(const path of ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md'])for(const [round,order]of [[0,['A','B']],[1,['B','A']]] as const)for(const arm of order){
 const text=fs.readFileSync(path,'utf8'),t=performance.now(),base=tagstackEncode(text),parentMs=performance.now()-t;
 assert.equal(base.message,old.get(path));assert.equal(base.decoded,text);
 const q=performance.now(),candidate=arm==='B'?apotomeFromFrontier(base.message):null,extensionMs=performance.now()-q;
 const message=candidate?.message??base.message;
 assert.equal(message,old.get(path)); // these frozen cases must reject
 console.log(JSON.stringify({path,round,order:order.join(''),arm,parentMs,extensionMs,totalMs:performance.now()-t,tokens:encode(message).length,admitted:!!candidate}));
}
