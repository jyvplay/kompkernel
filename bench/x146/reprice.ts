/** Final contract repair: reprice and replay the same saved parent wires. */
import * as fs from 'node:fs';import assert from 'node:assert/strict';import {ekdysisKey,ekdysisUndo} from '../../src/lib/omega/ekdysis';import {countTokens,encodeIds,decodeIds} from '../../src/lib/omega/bpe';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {chironDecode} from '../../src/lib/omega/chiron';import {readParent} from '../x135/reader';
for(const name of ['parent','root-parent','packages-parent'])for(const l of fs.readFileSync(`bench/x146/receipts/${name}.jsonl`,'utf8').split('\n').filter(Boolean)){
 const a=JSON.parse(l);if(!a.childMessage)continue;const child=a.childMessage as string;
 const decoded=child.startsWith('Before ¶ k=v. expand; print only.\n§')?chironDecode(child.slice(child.indexOf('§'))):readParent(child);
 assert.equal(decoded,a.folded);assert.equal(ekdysisUndo(decoded,a.depth,a.whole),fs.readFileSync(a.path,'utf8'));
 const message=ekdysisKey(a.depth,a.whole)+child,B=countTokens(message,'o200k_base');assert.equal(encode(message).length,B);assert.equal(Buffer.from(message).toString(),message);assert.equal(decodeIds(encodeIds(message,'o200k_base'),'o200k_base'),message);
 console.log(JSON.stringify({...a,receipt:name,oldB:a.B,B,message,tokenIdExact:true,sourceRead:true,method:'fixed saved parent reprice; no new parent search'}));
}
