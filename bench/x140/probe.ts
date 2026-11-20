import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {eikonTrial,eikonDecode} from '../../src/lib/omega/eikon';
import {steliUndo} from '../../src/lib/omega/steli';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const line of fs.readFileSync(process.argv[2]??'bench/x139/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),t=performance.now(),r=eikonTrial(a.message),ms=performance.now()-t;
 if(!r){console.log(JSON.stringify({path:a.path,eligible:false,ms}));continue;}
 assert.equal(encode(r.message).length,r.tokens);assert.equal(steliUndo(eikonDecode(r.message)),fs.readFileSync(a.path,'utf8'));
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:r.tokens,delta:r.tokens-a.tokens,ms,sourceExact:true,...r}));
}
