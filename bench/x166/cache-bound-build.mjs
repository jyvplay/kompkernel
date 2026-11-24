import fs from 'node:fs';import assert from 'node:assert/strict';import {transform} from 'esbuild';
const helper=JSON.parse(fs.readFileSync('bench/x166/receipts/runtime-patch.json','utf8')).helper;
const js=(await transform(helper+'\nexport {X166Cache};',{loader:'ts',format:'esm'})).code;
const {X166Cache}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const c=new X166Cache();let checks=0;
for(let round=0;round<3;round++)for(let i=0;i<40000;i++){const key='x'.repeat(i%70)+i;const v=key.length;const hit=c.get(key);if(hit!==undefined)assert.equal(hit,v);c.set(key,v);assert.equal(c.get(key),v);assert.ok(c.size<=32768);assert.ok(c.chars<=1048576);checks+=3;}
const huge='q'.repeat(1048577);c.set(huge,7);assert.equal(c.get(huge),7);assert.equal(c.size,1);assert.equal(c.chars,huge.length);checks+=3;
// Single oversized keys are retained; this experiment is NOT a hard byte-budget cache.
c.set('a',1);assert.equal(c.size,1);assert.equal(c.get('a'),1);checks+=2;
const r={checks,passed:true,entryBound:32768,keyUnitBound:'max(1048576, largest inserted key length)',scope:'eviction, revisits, oversized key; no claimed strict heap bound'};
fs.writeFileSync('bench/x166/receipts/cache-bound.json',JSON.stringify(r,null,2));console.log(r);
