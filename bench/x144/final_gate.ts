import * as fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {readParent} from '../x135/reader';import {psifidaUndo,PSIFIDA_KEY} from '../../src/lib/omega/psifida';
let prices=0,exact=0;const unsupported:string[]=[],invalidWire:string[]=[];
const parentHeaders=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'];
for(const name of ['frontier','probe','parent','heldout-baseline','heldout-probe','heldout-parent'])for(const line of fs.readFileSync(`bench/x144/receipts/${name}.jsonl`,'utf8').split('\n').filter(Boolean)){
 const a=JSON.parse(line);if(!a.message)continue;const base=name==='frontier'||name==='heldout-baseline';assert.equal(encode(a.message).length,base?a.tokens:a.B);prices++;
 const src=fs.readFileSync(a.path);assert.ok(Buffer.from(src.toString('utf8')).equals(src));
 if(Buffer.from(a.message,'utf8').toString('utf8')!==a.message){invalidWire.push(`${name}:${a.path}`);continue;}
 let m=a.message as string;if(!base){assert.ok(m.startsWith(PSIFIDA_KEY));m=m.slice(PSIFIDA_KEY.length);}
 let out:string;
 if(parentHeaders.some(p=>m.startsWith(p+'§')))out=readParent(m);
 else if(!base&&/^\d+(?: \d+)+\n/.test(m))out=m;
 else if(base&&m===src.toString('utf8'))out=m;
 else {unsupported.push(`${name}:${a.path}`);continue;}
 if(!base)out=psifidaUndo(out);
 assert.ok(Buffer.from(out).equals(src));exact++;
}
// Patch-targeted gate: never decode an auxiliary parentMessage in place of wire.
const original='12 34\n~~',auxiliary='00 00\n~~';assert.notEqual(psifidaUndo(original),psifidaUndo(auxiliary));
// UTF-8 normalization must not silently pass as arbitrary-byte fidelity.
assert.ok(!Buffer.from(Buffer.from([255]).toString('utf8')).equals(Buffer.from([255])));
console.log(JSON.stringify({prices,sourceByteExact:exact,unsupported,invalidWire,allWiresTransportSafe:invalidWire.length===0,native:'NOT_RUN',wireBound:true},null,2));
