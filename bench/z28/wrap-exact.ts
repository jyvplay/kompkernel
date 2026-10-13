// WRAPCANON exactness and size. For each real file: best width W in {0,60,64,68,72,76,80} (W=0 = identity), chosen by
// o200k count of the A3 wire of the encoded text; every encoding is decode-checked (wrapEncode returns null on any mismatch).
import fs from 'node:fs';
import path from 'node:path';
import { phalanxA3Encode } from '@/lib/omega/phalanx-a3';
import { countTokens } from '@/lib/omega/bpe';
import { wrapEncode, wrapDecode, wrapPickKeep } from '@/lib/omega/wrapcanon';
const enc = 'o200k_base' as const;
let a3T = 0, bestT = 0, bad = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const keep = wrapPickKeep(t);
  const a3 = phalanxA3Encode(t, enc).outTokens;
  let best = { W: 0, tok: a3 };
  if (keep !== null) {
    for (const W of [60, 64, 68, 72, 76, 80]) {
      const e = wrapEncode(t, W, keep);
      if (e === null) { bad++; continue; }
      if (wrapDecode(e, W, keep) !== t) bad++;
      const tok = phalanxA3Encode(e, enc).outTokens;
      if (tok < best.tok) best = { W, tok };
    }
  }
  a3T += a3; bestT += best.tok;
  console.log(`${path.basename(f)}: A3=${a3} wrap=${best.W === 0 ? 'off' : 'W=' + best.W} -> ${best.tok} (${(((best.tok - a3) / a3) * 100).toFixed(2)}%)`);
}
console.log(`ALL A3=${a3T} with wrap=${bestT} (${(((bestT - a3T) / a3T) * 100).toFixed(2)}%) decode failures=${bad}`);
