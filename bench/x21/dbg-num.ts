import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const d: any = daedalusEncode(t, 'o200k_base' as any);
const l: any = lakonikosEncode(t, 'o200k_base' as any);
const wire: string = d.wire;
const si = wire.indexOf('§'), pi = wire.indexOf('¶');
const tape = si >= 0 && pi > si ? wire.slice(si + 1, pi) : '';
const body = pi >= 0 ? wire.slice(pi + 1) : wire;
const occ = (s: string, h: string) => h.split(s).length - 1;
console.log('file', f.split('/').pop(), 'raw', d.inTokens, 'wire', d.outTokens, 'daedalusMsg', d.messageTokens, 'lakonikosMsg', l.messageTokens);
for (const p of ['\t0\t', '\t', 'commit ', 'Author: ', 'Date:   ']) {
  console.log(`  ${JSON.stringify(p).padEnd(12)} tape=${occ(p, tape)}  body=${occ(p, body)}`);
}
