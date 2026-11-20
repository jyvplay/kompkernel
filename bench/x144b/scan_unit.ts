import assert from 'node:assert/strict';import * as wire from '../../src/lib/omega/utf8-wire';
const toggle=(v:boolean)=>(wire as unknown as {setUtf8FastScan:(b:boolean)=>void}).setUtf8FastScan(v);let checks=0;
for(const arm of [false,true]){toggle(arm);for(let cp=0;cp<65536;cp++){const s=String.fromCharCode(cp);assert.equal(wire.isUtf8TransportStable(s),Buffer.from(s).toString('utf8')===s);checks++;}}
let seed=144;const rnd=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let i=0;i<20000;i++){let s='';for(let j=0;j<12;j++)s+=String.fromCharCode(rnd()%65536);const expected=Buffer.from(s).toString('utf8')===s;for(const arm of [false,true]){toggle(arm);assert.equal(wire.isUtf8TransportStable(s),expected);checks++;}}
console.log(JSON.stringify({checks,arms:2,oracle:'actual Node UTF-8 round trip'}));
