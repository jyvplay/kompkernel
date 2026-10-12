// UPPER BOUND ONLY (lossy, not a codec): collapse every run of 2+ spaces to one space, and report the A5 token change.
// Also reports the share of A5 output tokens that are whitespace-only.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
import { phalanxA5Encode } from '@/lib/omega/phalanx-a5';
const enc = 'o200k_base' as const;
let a = 0, b = 0, ws = 0, tot = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const collapsed = t.replace(/ {2,}/g, ' ');
  const A = phalanxA5Encode(t, enc).outTokens, B = phalanxA5Encode(collapsed, enc).outTokens;
  const toks = tokenStrings(t, enc);
  const wsTok = toks.filter((x) => x.s.trim() === '' && x.s.length > 0).length;
  a += A; b += B; ws += wsTok; tot += toks.length;
  console.log(`${path.basename(f)}: A5=${A} collapsed-spaces(lossy)=${B} (${(((B - A) / A) * 100).toFixed(2)}%) whitespace-only input tokens=${wsTok}/${toks.length}`);
}
console.log(`ALL A5=${a} collapsed=${b} (${(((b - a) / a) * 100).toFixed(2)}%) whitespace-only input tokens ${ws}/${tot}`);
