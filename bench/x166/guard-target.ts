import assert from 'node:assert/strict';import {symfrazFromFrontier} from '../../src/lib/omega/symfraz';
(globalThis as any).__x166OversizePrices=0;(globalThis as any).__x166OversizeScans=0;
const source='A 12345 B 67890 A 23456 B 78901';const r=symfrazFromFrontier(source,source,s=>s,()=> 'z'.repeat(51001),s=>s);
assert.equal(r.message,source);assert.equal((globalThis as any).__x166OversizePrices,0,'oversized parent priced before refusal');
assert.throws(()=>symfrazFromFrontier(source,'z'.repeat(51001),s=>s,s=>s,s=>s));assert.equal((globalThis as any).__x166OversizeScans,0,'oversized incumbent scanned before refusal');
console.log(JSON.stringify({checks:4,passed:true,oversizedPrices:(globalThis as any).__x166OversizePrices,oversizedScans:(globalThis as any).__x166OversizeScans}));
