import * as fs from 'node:fs';
import { allomorphFromFrontier } from '../../src/lib/omega/allomorph';
import { chironDecode } from '../../src/lib/omega/chiron';
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
import assert from 'node:assert/strict';
const output=fs.openSync('bench/x134/receipts/accepted.jsonl','w');
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')) {
 if(!line)continue; const a=JSON.parse(line); const t=Date.now();
 const b=allomorphFromFrontier(a.message,a.text);
 if(b){
  assert.equal(encode(b.message).length,b.tokens);
  assert.ok(b.tokens<a.tokens);
  assert.equal(chironDecode(b.message.slice(b.message.indexOf('§'))),chironDecode(a.message.slice(a.message.indexOf('§'))));
  fs.writeSync(output,JSON.stringify({path:a.path,before:a.message,after:b.message,A:a.tokens,B:b.tokens})+'\n');
 }
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:b?.tokens??a.tokens,delta:(b?.tokens??a.tokens)-a.tokens,ms:Date.now()-t,aliases:b?.aliases??0,probes:b?.probes??0,
 libraryCount:encode(b?.message??a.message).length,layerExact:!b||chironDecode(b.message.slice(b.message.indexOf('§')))===chironDecode(a.message.slice(a.message.indexOf('§')))}));
}
