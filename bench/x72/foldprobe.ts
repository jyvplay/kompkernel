import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { stadionFold } from '../../src/lib/omega/stadion';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const f = stadionFold(t);
  if (!f) { console.log(`${p}: no fold`); continue; }
  const rule = countTokens(f.rule, enc);
  console.log(`${p}: raw ${countTokens(t, enc)}  normal ${countTokens(f.normal, enc)}  rule ${rule}  sum ${countTokens(f.normal, enc) + rule}  widths ${f.widths.length} [${f.widths.slice(0, 10).join(',')}]`);
}
