import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {readParent} from '../x135/reader';
let prices=0,sharedReaderExact=0;const unsupported:string[]=[];
const badUtf8=Buffer.from([255]);assert.ok(!Buffer.from(badUtf8.toString('utf8'),'utf8').equals(badUtf8));
for(const name of ['frontier','heldout-baseline'])for(const line of fs.readFileSync(`bench/x143/receipts/${name}.jsonl`,'utf8').trim().split('\n')){
 const a=JSON.parse(line);assert.equal(encode(a.message).length,a.tokens);prices++;
 const sourceBytes=fs.readFileSync(a.path),src=sourceBytes.toString('utf8');assert.ok(Buffer.from(src,'utf8').equals(sourceBytes),'source must be valid UTF-8');assert.equal(a.text,src);
 if(a.message===src||['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(p=>a.message.startsWith(p+'§'))){assert.equal(readParent(a.message),src);sharedReaderExact++;}else unsupported.push(a.path);
}
// Empty candidate files are valid when admission rejects every source.
assert.deepEqual(''.trim().split('\n').filter(Boolean),[]);
for(const name of ['probe','heldout-probe','parent','heldout-parent'])for(const line of fs.readFileSync(`bench/x143/receipts/${name}.jsonl`,'utf8').trim().split('\n').filter(Boolean)){
 const a=JSON.parse(line);if(!('B' in a))continue;assert.equal(encode(a.message??(a.contract+a.folded)).length,a.B);prices++;
}
for(const a of JSON.parse(fs.readFileSync('bench/x143/receipts/native-trial.json','utf8')).cases){assert.equal(encode(fs.readFileSync(a.packet,'utf8')).length,a.B);prices++;}
console.log(JSON.stringify({referenceTokenizerPrices:prices,sharedReaderExact,unsupported,nativeVerified:false},null,2));
