import * as fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {readParent} from '../x135/reader';import {metaboleUndo} from '../../src/lib/omega/metabole';
let prices=0,exact=0;const unsupported:string[]=[];
for(const name of ['frontier','probe','parent'])for(const line of fs.readFileSync(`bench/x143b/receipts/${name}.jsonl`,'utf8').split('\n').filter(Boolean)){
 const a=JSON.parse(line);if(!a.message)continue;assert.equal(encode(a.message).length,name==='frontier'?a.tokens:a.B);prices++;
 const src=fs.readFileSync(a.path);assert.ok(Buffer.from(src.toString('utf8')).equals(src));
 let out:string;if(name==='probe')out=metaboleUndo(a.folded);else{
 const m=name==='parent'?a.parentMessage:a.message;
 if(m!==src.toString('utf8')&&!['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(p=>m.startsWith(p+'§'))){unsupported.push(`${name}:${a.path}`);continue;}
 out=m===src.toString('utf8')?m:readParent(m);if(name==='parent')out=metaboleUndo(out);
 }
 assert.ok(Buffer.from(out).equals(src));exact++;
}console.log(JSON.stringify({prices,sourceByteExact:exact,unsupported,native:'NOT_RUN'},null,2));
