import assert from 'node:assert/strict';import {prepareRuns,prepareRunCostState,scoreRunCostDeltaSlots} from '../../src/lib/omega/ariadne';import {encode as O} from 'gpt-tokenizer/encoding/o200k_base';import {encode as C} from 'gpt-tokenizer/encoding/cl100k_base';
let checks=0;const chars=['\0','a','\u00ff','\u0100','я','的','😀','\ud800','\udc00','\ufeff','\uffff','\n'];
for(const enc of ['o200k_base','cl100k_base'] as const){const e=enc==='o200k_base'?O:C;for(const n of [1,2,3]){const p=prepareRuns([Array.from({length:n},(_,i)=>i)]),cache=new Map<string,number>(),before=Array(n).fill('a'),state=prepareRunCostState(p,Array.from({length:n},(_,i)=>i),before,enc,cache);
 for(let i=0;i<4096;i++){const after=Array.from({length:n},(_,j)=>i<chars.length?chars[(i+j)%chars.length]:String.fromCharCode(((i*257)+(j*813))&65535));const r=scoreRunCostDeltaSlots(p,state,after,Array.from({length:n},(_,i)=>i),enc,cache);assert.equal(r.total,e(after.join('')).length);checks++;}
 // Revisits after more than128different high-byte pairs; fallback and old hits agree.
 for(const a of chars)for(const b of chars){const after=Array(n).fill(a);if(n>1)after[1]=b;const r=scoreRunCostDeltaSlots(p,state,after,Array.from({length:n},(_,i)=>i),enc,cache);assert.equal(r.total,e(after.join('')).length);checks++;}
}}
console.log(JSON.stringify({checks,passed:true,scope:'singleton/pair distinction, cross encoding, Unicode and surrogate halves, >128pages plus revisits, longer-run fallback'}));
