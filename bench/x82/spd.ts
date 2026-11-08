import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const lanes = process.argv.slice(2);
let tot = 0; const out: string[] = [];
for (const p of lanes) {
  const S = fs.readFileSync(p, 'utf8');
  const t0 = process.hrtime.bigint();
  const r: any = tagstackFrontier(S, enc);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  tot += ms; out.push(`${p.split('/').pop()} tok=${r.messageTokens} ms=${ms.toFixed(0)}`);
}
console.log(out.join('\n'));
console.log(`TOTAL ${tot.toFixed(0)} ms`);
