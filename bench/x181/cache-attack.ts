import assert from 'node:assert/strict';import fs from 'node:fs';import {PairCache} from './pair-cache';
const c=new PairCache(),seen=new Map<number,number>();let collisions=0,checks=0,seed=181;
for(let i=0;i<200000;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;const slot=Math.imul(seed,0x9e3779b1)>>>14,old=seen.get(slot);c.set(seed,i%13);assert.equal(c.get(seed),i%13);checks++;if(old!==undefined&&old!==seed){assert.equal(c.get(old),undefined);collisions++;checks++;}seen.set(slot,seed);}
assert.ok(collisions>0);c.clear();for(const k of seen.values()){assert.equal(c.get(k),undefined);checks++;}
for(const k of [0,-1,2147483647,-2147483648]){c.set(k,0);assert.equal(c.get(k),0);checks++;}
fs.writeFileSync('bench/x181/receipts/cache-attack.json',JSON.stringify({checks,collisions},null,2));console.log({checks,collisions});
