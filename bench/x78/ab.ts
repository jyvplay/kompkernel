import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const out: any[] = [];
for (const p of process.argv.slice(3)) {
  const t = fs.readFileSync(p, 'utf8');
  const t0 = process.hrtime.bigint();
  const r: any = tagstackEncode(t, enc);
  const ms = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);
  out.push({ lane: p.split('/').pop(), ms, tok: r.messageTokens });
  console.log(`${process.argv[2].padEnd(6)} ${p.split('/').pop()!.padEnd(20)} ${String(ms).padStart(7)} ms ${String(r.messageTokens).padStart(5)} tok`);
}
console.log(`${process.argv[2].padEnd(6)} TOTAL ${out.reduce((a, r) => a + r.ms, 0)} ms`);
