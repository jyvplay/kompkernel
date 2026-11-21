import fs from 'node:fs';import assert from 'node:assert/strict';import {nativeLcp} from '../../src/lib/omega/lcp-native';
const ref=(a:string,b:string,lim:number)=>{let i=0;while(i<Math.min(a.length,b.length,lim)&&a.charCodeAt(i)===b.charCodeAt(i))i++;return i};let checks=0;
for(const n of [0,1,15,16,17,63,64,65,79,80,81,255,4096,5000,20000])for(const ch of ['a','λ','\ud800','\n'])for(const at of [0,1,15,16,17,63,64,79,80,81,255,4095,n-1,n]){
 const a=ch.repeat(n),b=a.slice(0,Math.max(0,at))+'X'+a.slice(Math.max(0,at)+1);
 for(const lim of [0,15,16,80,n,n+1]){assert.equal(nativeLcp(a,b,lim),ref(a,b,lim));checks++}
 assert.equal(nativeLcp(a,a),a.length);checks++;
}
for(let i=0;i<4000;i++){const a=('α🧬\r\nabcdef'+String(i)).repeat(i%40),at=(i*37)%(a.length+1),b=a.slice(0,at)+'!'+a.slice(at+1);assert.equal(nativeLcp(a,b),ref(a,b,Math.max(a.length,b.length)));checks++}
fs.writeFileSync('bench/x148/receipts/lcp-unit.json',JSON.stringify({checks}));console.log({checks});
