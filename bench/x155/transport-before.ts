import fs from 'node:fs';import {stoibasPlans,stoibasCandidate,stoibasCompactPlans,stoibasCompactCandidate} from '../../src/lib/omega/stoibas';import {isUtf8TransportStable} from '../../src/lib/omega/utf8-wire';
const source='{\n  "x": 1\n}\n';const rows=[];
for(const compact of [false,true]){const p=(compact?stoibasCompactPlans:stoibasPlans)(source)[0],r=(compact?stoibasCompactCandidate:stoibasCandidate)(source,p.width,'\ud800',()=>p.folded);rows.push({compact,accepted:!!r,stable:r?isUtf8TransportStable(r.message):null});}
fs.writeFileSync('bench/x155/receipts/transport-before.json',JSON.stringify(rows,null,2));console.log(rows);
