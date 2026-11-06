import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const t0 = process.hrtime.bigint();
  const r: any = tagstackEncode(t, enc);
  console.log(`${p.split('/').pop()} ${Math.round(Number(process.hrtime.bigint()-t0)/1e6)} ms ${r.messageTokens} tok`);
}
