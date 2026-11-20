/** Re-run all affected gates on frozen candidate messages after reader repair. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {anakykliDecode} from '../../src/lib/omega/anakykli';
import {readParent} from './reader';
for(const line of fs.readFileSync('bench/x135/receipts/rotation.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line);const decoded=anakykliDecode(a.message,readParent);
 const exact=Buffer.from(decoded,'utf8').equals(fs.readFileSync(a.path));
 assert.equal(exact,true);assert.equal(encode(a.message).length,a.B);
 const inner=a.message.slice(a.message.indexOf('\n')+1);
 console.log(JSON.stringify({path:a.path,cut:a.cut,sourceExact:exact,libraryTokens:encode(a.message).length,innerTokens:encode(inner).length,baseline:a.A,innerDelta:encode(inner).length-a.A,delta:a.delta}));
}
