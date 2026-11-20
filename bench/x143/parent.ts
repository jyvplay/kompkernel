import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {protasisPlans,protasisUndo} from '../../src/lib/omega/protasis';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const rows=fs.readFileSync(process.argv[2]??'bench/x142/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const candidates=rows.flatMap(a=>{const text=fs.readFileSync(a.path,'utf8'),p=protasisPlans(text).filter(p=>p.changed>=8&&p.exceptions<=p.changed).sort((a,b)=>a.tokens-b.tokens)[0];return p?[{a,text,p}]:[];});
candidates.sort((a,b)=>(b.p.changed-b.p.exceptions)-(a.p.changed-a.p.exceptions));
for(const {a,text,p}of candidates.slice(0,8)){
 const t=performance.now(),q=tagstackEncode(p.folded),ms=performance.now()-t;assert.equal(protasisUndo(q.decoded,p.mode),text);
 const message=p.contract+q.message;console.log(JSON.stringify({path:a.path,A:a.tokens,B:encode(message).length,ms,sourceExact:true,...p,message,parentMessage:q.message}));
}
