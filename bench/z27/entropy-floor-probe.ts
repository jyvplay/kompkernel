// Entropy floor: share of A3 output tokens that sit inside high-entropy runs (base64/hex >= 32 chars, e.g. integrity hashes).
// Such runs are not reducible by any dictionary/alias stage, so they bound the achievable gain on a lane.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
const HI = /[A-Za-z0-9+/=_-]{32,}/g;
let all = 0, hi = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const out = phalanxA3Encode(t, 'o200k_base').wire;
  const tot = countTokens(out, 'o200k_base');
  let h = 0;
  for (const m of out.matchAll(HI)) h += countTokens(m[0], 'o200k_base');
  all += tot; hi += h;
  console.log(`${f}: A3=${tot} high-entropy-run tokens=${h} (${((100 * h) / tot).toFixed(1)}%)`);
}
console.log(`ALL A3=${all} high-entropy=${hi} (${((100 * hi) / all).toFixed(1)}%)`);
