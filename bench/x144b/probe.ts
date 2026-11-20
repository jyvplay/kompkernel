import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {colexPlans,colexUndo} from '../../src/lib/omega/colex';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const l of fs.readFileSync(process.argv[2]??'bench/x144/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l),text=fs.readFileSync(a.path,'utf8'),t=performance.now(),plans=colexPlans(text);
 if(!plans.length)console.log(JSON.stringify({path:a.path,eligible:false}));
 for(const p of plans){assert.equal(colexUndo(p.folded,p.sep),text);assert.equal(encode(p.message).length,p.tokens);console.log(JSON.stringify({path:a.path,A:a.tokens,B:p.tokens,raw:encode(text).length,ms:performance.now()-t,sourceExact:true,...p}));}
}
