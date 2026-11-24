import assert from 'node:assert/strict';import fs from 'node:fs';import {x174Utf8} from './utf8-target';
const te=new TextEncoder(),buf=new Uint8Array(5000);let checks=0;
function check(s:string){buf.fill(0xa5);const n=x174Utf8(s,buf);assert.deepEqual(buf.slice(0,n),te.encode(s));assert.ok(n<=3*s.length);assert.equal(buf[n],0xa5);checks++;}
for(let cp=0;cp<=0x10ffff;cp++)check(String.fromCodePoint(cp));
for(const s of ['','\ud800\ud800\udc00\udc00','\udfff\ud800','\ufeff','😀é漢A','a'.repeat(340)+'😀','漢'.repeat(341),'é'.repeat(342),'x\u0000\ud800y'])check(s);
fs.writeFileSync('bench/x174/receipts/utf8-gate.json',JSON.stringify({checks,oracle:'TextEncoder bytes, length bound and scratch sentinel',errors:0},null,2));console.log({checks});
