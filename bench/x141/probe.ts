import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {mnemaPlan,mnemaDecode} from '../../src/lib/omega/mnema';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
for(const line of fs.readFileSync(process.argv[2]??'bench/x140/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),text=fs.readFileSync(a.path,'utf8');
 for(const threshold of [0,1,2]){
  const start=performance.now(),r=mnemaPlan(text,threshold),ms=performance.now()-start;
  if(!r){console.log(JSON.stringify({path:a.path,threshold,eligible:false,ms}));continue;}
  assert.equal(mnemaDecode(r.message),text);assert.equal(encode(r.message).length,r.tokens);
  console.log(JSON.stringify({path:a.path,A:a.tokens,B:r.tokens,threshold,ms,sourceExact:true,...r}));
 }
}
