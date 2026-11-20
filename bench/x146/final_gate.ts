import * as fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {encodeIds,decodeIds} from '../../src/lib/omega/bpe';import {readParent} from '../x135/reader';import {chironDecode} from '../../src/lib/omega/chiron';import {ekdysisFrontierDecode} from '../../src/lib/omega/ekdysis-frontier';
let prices=0,exact=0;const unsupported:string[]=[];
for(const name of ['frontier','final-parent','integration','scalar-confirm'])for(const l of fs.readFileSync(`bench/x146/receipts/${name}.jsonl`,'utf8').split('\n').filter(Boolean)){
 const a=JSON.parse(l),m=a.message,source=fs.readFileSync(a.path);assert.equal(Buffer.from(m).toString(),m);assert.equal(decodeIds(encodeIds(m,'o200k_base'),'o200k_base'),m);assert.equal(encode(m).length,a.B??a.tokens);prices++;
 let out:string;
 if(name==='final-parent'||name==='integration')out=ekdysisFrontierDecode(m);
 else if(m===source.toString())out=m;
 else if(m.startsWith('Before ¶ k=v. expand; print only.\n§'))out=chironDecode(m.slice(m.indexOf('§')));
 else if(['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(h=>m.startsWith(h+'§')))out=readParent(m);
 else {unsupported.push(name+':'+a.path);continue;}
 assert.ok(Buffer.from(out).equals(source));exact++;
}
console.log(JSON.stringify({prices,transportAndTokenId:prices,sourceExact:exact,unsupported,native:'NOT_RUN'},null,2));
