import * as fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {encodeIds,decodeIds} from '../../src/lib/omega/bpe';import {readParent} from '../x135/reader';import {chironDecode} from '../../src/lib/omega/chiron';
let prices=0,exact=0;const unsupported:string[]=[];
for(const name of ['frontier','frontier-scalar','integration','heldout','heldout-baseline'])for(const l of fs.readFileSync(`bench/x145/receipts/${name}.jsonl`,'utf8').trim().split('\n')){
 const a=JSON.parse(l),m=a.message,source=fs.readFileSync(a.path);assert.equal(Buffer.from(m).toString('utf8'),m);assert.equal(decodeIds(encodeIds(m,'o200k_base'),'o200k_base'),m);assert.equal(encode(m).length,a.tokens);prices++;
 let out:string;
 if(m===source.toString('utf8'))out=m;
 else if(m.startsWith('Before ¶ k=v. expand; print only.\n§'))out=chironDecode(m.slice(m.indexOf('§')));
 else if(['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(h=>m.startsWith(h+'§')))out=readParent(m);
 else {unsupported.push(name+':'+a.path);continue;}
 assert.ok(Buffer.from(out).equals(source));exact++;
}
console.log(JSON.stringify({prices,transportAndTokenId:prices,sourceExact:exact,unsupported,native:'NOT_RUN'},null,2));
