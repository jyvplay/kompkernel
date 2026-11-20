import * as fs from 'node:fs';import assert from 'node:assert/strict';import {chironDecode} from '../../src/lib/omega/chiron';import {isUtf8TransportStable,utf8WireChoice} from '../../src/lib/omega/utf8-wire';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
const transport=(s:string)=>Buffer.from(s,'utf8').toString('utf8');let checks=0;
for(let cp=0;cp<=0xffff;cp++){const s=String.fromCharCode(cp);assert.equal(isUtf8TransportStable(s),transport(s)===s);checks++;}
for(const s of ['🙂','\ud800x','x\udc00','\ud800\ud800\udc00','\ud800\udc00\udc00','\ud800\udc00\ud800','\r\n\0','é','e\u0301']){assert.equal(isUtf8TransportStable(s),transport(s)===s);checks++;}
assert.throws(()=>utf8WireChoice('\ud800','safe'));checks++;
const rows=[];
for(const name of ['frontier','heldout-baseline'])for(const line of fs.readFileSync(`bench/x144/receipts/${name}.jsonl`,'utf8').trim().split('\n')){
 const a=JSON.parse(line),source=fs.readFileSync(a.path,'utf8'),r=utf8WireChoice(source,a.message);
 assert.equal(transport(r.message),r.message);checks++;rows.push({path:a.path,originalTokens:a.tokens,repairedTokens:encode(r.message).length,fallback:r.fallback});
 if(a.path.endsWith('/vite.md')){
  const start=a.message.indexOf('§'),wire=a.message.slice(start);assert.equal(chironDecode(wire),source);checks++;
  assert.notEqual(chironDecode(transport(wire)),source);checks++;
  assert.equal(r.message,source);checks++;
 }
}
console.log(JSON.stringify({checks,rows,unsafeWires:rows.filter(r=>r.fallback).length,guardScope:'transport stability only; opt-in helper not integrated; guarded fallback repriced',native:'NOT_RUN'},null,2));
