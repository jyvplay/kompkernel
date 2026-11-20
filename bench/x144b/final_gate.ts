import * as fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {readParent} from '../x135/reader';
import {encodeIds,decodeIds} from '../../src/lib/omega/bpe';
import {COLEX_SEPARATORS,colexKey,colexUndo} from '../../src/lib/omega/colex';import {chironDecode} from '../../src/lib/omega/chiron';
let prices=0,exact=0,transport=0;const unsupported:string[]=[];
for(const name of ['frontier','repair','probe','parent','heldout-baseline','heldout-probe','heldout-parent'])for(const l of fs.readFileSync(`bench/x144b/receipts/${name}.jsonl`,'utf8').split('\n').filter(Boolean)){
 const a=JSON.parse(l);if(!a.message)continue;const m=a.message as string,src=fs.readFileSync(a.path);assert.equal(Buffer.from(m).toString('utf8'),m);transport++;assert.equal(decodeIds(encodeIds(m,'o200k_base'),'o200k_base'),m);assert.ok(Buffer.from(src.toString('utf8')).equals(src));assert.equal(encode(m).length,(name==='frontier'||name==='heldout-baseline')?a.tokens:a.B);prices++;
 let payload=m,sep:typeof COLEX_SEPARATORS[number]|undefined;
 if(name.endsWith('probe')||name.endsWith('parent')){sep=COLEX_SEPARATORS.find(s=>m.startsWith(colexKey(s)));assert.ok(sep);payload=m.slice(colexKey(sep).length);}
 let out:string;
 if(name.endsWith('probe'))out=payload;
 else if(['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].some(p=>payload.startsWith(p+'§')))out=readParent(payload);
 else if(payload.startsWith('Before ¶ k=v. expand; print only.\n§'))out=chironDecode(payload.slice(payload.indexOf('§')));
 else if(payload===src.toString('utf8'))out=payload;
 else {unsupported.push(`${name}:${a.path}`);continue;}
 if(sep)out=colexUndo(out,sep);assert.ok(Buffer.from(out).equals(src));exact++;
}
console.log(JSON.stringify({prices,transportStable:transport,tokenIdRoundTrips:transport,sourceByteExact:exact,unsupported,native:'NOT_RUN'},null,2));
