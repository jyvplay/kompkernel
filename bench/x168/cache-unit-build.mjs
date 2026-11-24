import fs from 'node:fs';import assert from 'node:assert/strict';import {transform} from 'esbuild';
const source=fs.readFileSync('bench/x168/cache-build.mjs','utf8'),match=/const budget=`([\s\S]*?)`;/m.exec(source);assert.ok(match);let checks=0;
for(const arm of ['B','C']){let text=match[1];if(arm==='C')text=text.replace('return super.set(key,value);}', 'return super.set(key.length>12?Buffer.from(key,"utf16le").toString("utf16le"):key,value);}');const js=(await transform(text,{loader:'ts',target:'es2022'})).code;const MapClass=new Function('Buffer',js+';return X168BudgetMap;')(Buffer);const m=new MapClass();
 for(let i=0;i<5000;i++){const key=i.toString().padStart(4,'0')+'\ud800'+ 'x'.repeat(996);m.set(key,i);assert.equal(m.get(key),i);assert.ok(m.chars<=4000000);checks+=2;}
 assert.ok(m.clears>0);checks++;const key='\ud800'.repeat(20);m.set(key,1);const n=m.chars;m.set(key,2);assert.equal(m.chars,n);assert.equal(m.get(key),2);assert.equal(m.delete(key),true);assert.equal(m.chars,n-key.length);checks+=4;
 m.set('x'.repeat(4000001),1);assert.ok(m.skipped>0);assert.equal(m.has('x'.repeat(4000001)),false);checks+=2;m.clear();assert.equal(m.chars,0);assert.equal(m.size,0);checks+=2;
}
fs.writeFileSync('bench/x168/receipts/cache-unit.json',JSON.stringify({checks,arms:['B','C'],scope:'Actual injected cache class capacity/overwrite/delete/oversize/lone-surrogate stress; not whole-encoder speed or heap bound'},null,2));console.log({checks});
