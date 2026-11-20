import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {readParent} from '../x135/reader';
import {ptycheDefaultUndo} from '../../src/lib/omega/ptyche';
let prices=0,sourceExact=0;
for(const name of ['frontier','patched-frontier']){
 const rows=fs.readFileSync(`bench/x136/receipts/${name}.jsonl`,'utf8').trim().split('\n').map(l=>JSON.parse(l));
 assert.equal(rows.length,29);
 for(const a of rows){assert.equal(a.text,fs.readFileSync(a.path,'utf8'));assert.equal(encode(a.message).length,a.tokens);prices++;}
}
for(const line of fs.readFileSync('bench/x136/receipts/default-layout.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),parent='¶ k=v. expand repeatedly; print only.\n'+a.message.slice(a.message.indexOf('\n')+1);
 assert.equal(encode(a.message).length,a.B);prices++;
 assert.ok(Buffer.from(ptycheDefaultUndo(readParent(parent),a.width),'utf8').equals(fs.readFileSync(a.path)));sourceExact++;
}
for(const name of ['ablation','fused-layout'])for(const line of fs.readFileSync(`bench/x136/receipts/${name}.jsonl`,'utf8').trim().split('\n')){
 const a=JSON.parse(line);assert.equal(encode(a.message).length,a.B);prices++;
}
const defaults=fs.readFileSync('bench/x136/receipts/default-layout.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const bases=fs.readFileSync('bench/x136/receipts/patched-frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const line of fs.readFileSync('bench/x136/receipts/endtoend.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line);assert.equal(encode(a.message).length,a.B);prices++;
 const expected=a.admitted?defaults.find(r=>r.path===a.path):bases.find(r=>r.path===a.path);
 assert.equal(a.message,expected.message); // accepted wire already independently source-audited
}
console.log(JSON.stringify({libraryPriceChecks:prices,defaultLayoutSourceChecks:sourceExact,endToEndMessagesMatchFrozen:2,nativeModelVerification:false}));
