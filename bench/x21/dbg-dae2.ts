import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const d: any = daedalusEncode(t, 'o200k_base' as any);
const wire: string = d.wire;
const si = wire.indexOf('§'), pi = wire.indexOf('¶');
const tape = wire.slice(si + 1, pi);
const body = wire.slice(pi + 1);
const occ = (s: string, h: string) => h.split(s).length - 1;
console.log('raw', d.inTokens, '-> wire', d.outTokens, '| msg', d.messageTokens);
console.log('tape chars', tape.length, ' body chars', body.length);
for (const p of ['-118.', '-117.', '34.', '33.', ',', '1992-']) {
  console.log(`  ${JSON.stringify(p).padEnd(9)} tape=${occ(p, tape)}  body=${occ(p, body)}`);
}
console.log('--- tape tail (last 300 chars) ---');
console.log(JSON.stringify(tape.slice(-300)));
