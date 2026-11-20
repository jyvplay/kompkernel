import assert from 'node:assert/strict';import * as fs from 'node:fs';import {scalarCompile,SCALAR_HEADERS} from '../../src/lib/omega/scalar';import {chironDecode} from '../../src/lib/omega/chiron';import {isUtf8TransportStable} from '../../src/lib/omega/utf8-wire';
const h=SCALAR_HEADERS[0];let checks=0,accepted=0;const samples:any[]=[];
function test(w:string){const source=chironDecode(w);const p=scalarCompile(h+w,source);assert.ok(p,w);assert.equal(p.decoded,source);assert.equal(Buffer.from(p.message).toString('utf8'),p.message);assert.equal(p.message.startsWith(h+'§')?chironDecode(p.message.slice(h.length)):p.message,source);checks+=4;accepted++;samples.push({message:p.message,source});return p;}
const fork=test('§А\udc00¶\ud800А \ud801А');assert.equal(fork.variants,2);checks++;
test('§А\ud800БА¶Б\udc00');test('§А\ud800Б\udc00¶АБ');test('§А\udc00БAАZ¶\ud800А\r\n\0\ud801А');
for(let hi=0xd800;hi<=0xdbff;hi++){const a=String.fromCharCode(hi),b=String.fromCharCode(0xdc00+(hi%1024));test('§Аprefix '+a+'¶А'+b+'\nА'+b);test('§А'+b+'¶'+a+'А');}
for(const w of ['§А\ud800¶Аx','§А\udc00¶А','§АА\ud800¶А\udc00','§А×x\ud800¶А\udc00']){assert.equal(scalarCompile(h+w),null);checks++;}
assert.equal(scalarCompile(h+'§Аok¶А'),null);assert.equal(scalarCompile('unknown §А\ud800¶А\udc00'),null);assert.equal(scalarCompile('x'.repeat(100001)),null);checks+=3;
// Patch-targeted adversary: exponential acyclic expansion must refuse before decode.
let tape='А\ud800',last='А';for(let i=1;i<22;i++){const g=String.fromCharCode(0x410+i);tape+=g+last+last;last=g;}assert.equal(scalarCompile(h+'§'+tape+'¶'+last+'\udc00'),null);checks++;
// Wrong source is not accepted merely because the grammar is self-consistent.
assert.equal(scalarCompile(h+'§А\ud800¶А\udc00','wrong'),null);checks++;
const vite=JSON.parse(fs.readFileSync('bench/x144/receipts/heldout-baseline.jsonl','utf8').split('\n')[0]);test(vite.message.slice(h.length));
fs.writeFileSync('bench/x145/receipts/unit-wires.jsonl',samples.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log(JSON.stringify({checks,accepted,forkVariants:fork.variants}));
