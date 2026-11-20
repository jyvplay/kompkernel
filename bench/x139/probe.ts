import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {apotomeTrial} from '../../src/lib/omega/apotome';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';
for(const l of fs.readFileSync(process.argv[2]??'bench/x138/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l),t=performance.now(),r=apotomeTrial(a.message),ms=performance.now()-t;
 if(!r){console.log(JSON.stringify({path:a.path,eligible:false,ms}));continue;}
 assert.equal(encode(r.message).length,r.tokens);
 const sourceExact=steliUndo(r.target)===fs.readFileSync(a.path,'utf8');assert.ok(sourceExact);
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:r.tokens,delta:r.tokens-a.tokens,ms,sourceExact,...r}));
}
