import fs from 'node:fs';import assert from 'node:assert/strict';import {stoibasPlans,stoibasCandidate,stoibasCompactPlans,stoibasCompactCandidate} from '../../src/lib/omega/stoibas';
const source='{\n  "x": 1\n}\n';let checks=0;
for(const compact of [false,true]){const p=(compact?stoibasCompactPlans:stoibasPlans)(source)[0];for(const parent of ['\ud800','\udfff','prefix\ud800suffix']){assert.equal((compact?stoibasCompactCandidate:stoibasCandidate)(source,p.width,parent,()=>p.folded),null);checks++;}}
fs.writeFileSync('bench/x155/receipts/transport-after.json',JSON.stringify({checks,passed:true})+'\n');console.log({checks});
