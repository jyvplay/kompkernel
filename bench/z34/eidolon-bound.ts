// Z34: EIDOLON bound. Token saving from deleting predictable function words, BEFORE any residual is paid.
// Each deleted word is an upper bound on what an exact residual could ever return. Measurement only.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const WORDS = [' the', ' a', ' an', ' is', ' are', ' was', ' were', ' of', ' to', ' in', ' that', ' and'];
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const base = countTokens(t, enc);
  let del = t, occ = 0;
  for (const w of WORDS) { const n = del.split(w).length - 1; occ += n; del = del.split(w).join(''); }
  const after = countTokens(del, enc);
  console.log(JSON.stringify({ file: f.split('/').pop(), base, deletedOcc: occ, afterDelete: after, upperBoundSavePct: +((1 - after / base) * 100).toFixed(2), note: 'deletion is NOT lossless without a residual' }));
}
