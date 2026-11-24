// V8 retention diagnostic only. This is not a compression or whole-stack benchmark.
import fs from 'node:fs';import assert from 'node:assert/strict';
if(!global.gc)throw Error('run with --expose-gc');
const arm=process.argv[2];global.gc();const before=process.memoryUsage().heapUsed;const keys=new Map();
for(let i=0;i<2000;i++){const parent='x'.repeat(10000)+String(i).padStart(16,'0')+'y'.repeat(10000);const key=parent.slice(10000,10016);const detached=arm==='B'?(' '+key).slice(1):key;assert.equal(key,detached);keys.set(detached,i);}
global.gc();const after=process.memoryUsage().heapUsed;assert.equal(keys.size,2000);for(let i=0;i<2000;i++)assert.equal(keys.get(String(i).padStart(16,'0')),i);
const r={arm,keys:keys.size,heapDelta:after-before,scope:'2000 exact 16-unit slices from distinct 20016-unit generated parents; V8 diagnostic, not real-source compression'};
fs.writeFileSync(`bench/x166/receipts/retention-micro-${arm}.json`,JSON.stringify(r,null,2));console.log(r);
