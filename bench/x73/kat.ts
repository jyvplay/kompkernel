import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { stichomythiaEncode, stichomythiaDecode } from '../../src/lib/omega/stichomythia';
const enc: any = 'o200k_base';
const raw = process.argv.slice(2);
let tr = 0, tm = 0;
for (const p of raw) {
  const t = fs.readFileSync(p, 'utf8');
  const r = stichomythiaEncode(t, enc);
  const d = r.applied ? stichomythiaDecode(r.message) : t;
  tr += countTokens(t, enc); tm += r.messageTokens;
  console.log(`${path.basename(p).padEnd(24)} raw ${String(countTokens(t, enc)).padStart(5)} -> ${String(r.messageTokens).padStart(5)} applied=${r.applied ? 'Y' : 'n'} ${r.rows}x${r.cols} exact=${d === t} ${r.ms}ms ${r.applied ? '' : r.notes}`);
  if (r.applied && process.env.SHOW) console.log(JSON.stringify(r.message));
}
console.log(`TOTAL raw ${tr} -> ${tm} (${((100 * (tm - tr)) / tr).toFixed(1)}%)`);
