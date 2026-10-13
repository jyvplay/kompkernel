// Z39 probe: VERITAS-Q on one file (exactness and counts), plus the wire head.
import fs from 'node:fs';
import { veritasQEncode } from '@/lib/omega/veritas-q';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const t0 = Date.now();
const q = veritasQEncode(t);
console.log(JSON.stringify({ f, inTokens: q.inTokens, vxq: q.outTokens, legend: q.legend, entries: q.entries, exact: q.exact, ms: Date.now() - t0 }));
fs.writeFileSync('/home/user/z39/vxq-' + f.split('/').pop() + '.wire.txt', q.wire);
