// UPPER BOUND ONLY (lossy, not a codec): join every hard-wrap newline inside a paragraph with a space.
// Measures how many A3 tokens the wrap newlines cost at most. Not decodable; used only to decide whether to build the exception layer.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
const enc = 'o200k_base' as const;
let a = 0, b = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const joined = t.split(/\n\n/).map((p) => p.split('\n').map((l) => l.trim()).join(' ')).join('\n\n');
  const A = phalanxA3Encode(t, enc).outTokens, B = phalanxA3Encode(joined, enc).outTokens;
  a += A; b += B;
  console.log(`${path.basename(f)}: A3=${A} A3(all wrap newlines joined, lossy)=${B} (${(((B - A) / A) * 100).toFixed(2)}%)`);
}
console.log(`ALL A3=${a} upper-bound=${b} (${(((b - a) / a) * 100).toFixed(2)}%)`);
