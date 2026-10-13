// Per-file A6 vs A7 o200k token comparison on the ops groups (diagnostic for the +13 gap).
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA6Encode } from '@/lib/omega/phalanx-a6';
import { phalanxA7Encode, phalanxA7Decode } from '@/lib/omega/phalanx-a7';
const enc = 'o200k_base' as const;
const files = fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f))
  .concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f)))
  .concat(fs.readdirSync('bench/z29/ops-real').map((f) => path.join('bench/z29/ops-real', f)));
let s6 = 0, s7 = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const a6 = phalanxA6Encode(t, enc);
  const a7 = phalanxA7Encode(t, enc);
  if (phalanxA7Decode(a7.wire) !== t) console.log('FAIL', f);
  s6 += a6.outTokens; s7 += a7.outTokens;
  const d = a7.outTokens - a6.outTokens;
  console.log(`${d === 0 ? '  ' : d > 0 ? '+ ' : '- '}${String(d).padStart(5)} A6=${String(a6.outTokens).padStart(6)} A7=${String(a7.outTokens).padStart(6)} layer6=${a6.layer} layer7=${a7.layer} ${f}`);
}
console.log(`TOTAL A6=${s6} A7=${s7} diff=${s7 - s6}`);
