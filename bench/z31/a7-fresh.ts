// Z31: PHALANX-A7 (current stack) on the fresh real-doc corpus: o200k tokens, layer, exact decode, time.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA7Encode, phalanxA7Decode } from '@/lib/omega/phalanx-a7';
const enc = 'o200k_base' as const;
const [listFile, outFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = performance.now();
  const r = phalanxA7Encode(t, enc);
  const ms = Math.round(performance.now() - t0);
  fs.appendFileSync(outFile, JSON.stringify({ file: f, inT: countTokens(t, enc), a7T: r.outTokens, layer: r.layer, ok: phalanxA7Decode(r.wire) === t, ms }) + '\n');
}
console.log('done', files.length);
