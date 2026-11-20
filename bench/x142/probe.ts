import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {eutaxiaPlans,eutaxiaUndo} from '../../src/lib/omega/eutaxia';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const line of fs.readFileSync(process.argv[2]??'bench/x141/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),text=fs.readFileSync(a.path,'utf8'),t=performance.now(),plans=eutaxiaPlans(text),ms=performance.now()-t;
 if(!plans.length)console.log(JSON.stringify({path:a.path,eligible:false,ms}));
 for(const p of plans){assert.equal(eutaxiaUndo(p.folded,p.spec),text);console.log(JSON.stringify({path:a.path,A:a.tokens,B:encode(p.contract+p.folded).length,raw:encode(text).length,ms,sourceExact:true,...p}));}
}
