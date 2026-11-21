import fs from 'node:fs';import assert from 'node:assert/strict';import {HORION_OUTER,horionFrontierRead} from '../../src/lib/omega/horion-frontier';import {horionPlans} from '../../src/lib/omega/horion';
const source=fs.readFileSync('bench/x147/heldout/geyser.csv','utf8'),p=horionPlans(source)[0],meta=JSON.stringify(p.spec)+'\n';let checks=0;
assert.equal(horionFrontierRead(p.message),source);checks++;
assert.equal(horionFrontierRead(HORION_OUTER+meta+p.reduced),source);checks++;
for(const message of [HORION_OUTER+'null\n'+p.reduced,HORION_OUTER+meta+'x'.repeat(42000),HORION_OUTER+meta+p.reduced+'\ud800',HORION_OUTER+meta+'not a supported parent',HORION_OUTER+'[16,"x",1,"68","short","long"]\n'+p.reduced]){assert.throws(()=>horionFrontierRead(message));checks++}
// Unsupported parent must not silently be interpreted as a decoded table.
const altered=source.replace('3.6,79,long','3.6,79,short');assert.equal(horionPlans(altered).length,0);checks++;
fs.writeFileSync('bench/x147/receipts/composite-unit.json',JSON.stringify({checks}));console.log({checks});
