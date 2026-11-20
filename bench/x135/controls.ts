/** Contract falsifiers, not simulated model experiments or new-codec claims. */
import * as fs from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {countTokens} from '../../src/lib/omega/bpe';
const rows=fs.readFileSync('bench/x135/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const entropy=rows.map(a=>{
 const bytes=Buffer.from(a.text),payload=gzipSync(bytes),wire='Decode base64, gunzip, and print the exact text:\n'+payload.toString('base64');
 assert.deepEqual(gunzipSync(payload),bytes);
 return {path:a.path,baseline:a.tokens,gzipMessageTokens:countTokens(wire,'o200k_base'),machineExact:true,nativeReaderVerified:false};
});
const erase=(s:string)=>s.replace(/\s+/g,'');
const x='keep this\n',y='keep  this\n';assert.notEqual(x,y);assert.equal(erase(x),erase(y));
const named='<T0>';const customVocabulary={logicalClaim:1,actualTokens:countTokens(named,'o200k_base'),wire:named,admissible:false};
console.log(JSON.stringify({entropy,erasureCollision:{x,y,encoded:erase(x),injective:false,note:'exact deterministic eraser, NOT an LLM simulation'},customVocabulary},null,2));
