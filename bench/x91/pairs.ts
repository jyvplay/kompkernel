// Does the current wire already exploit glyph-pair merges? And are 0/1-use entries real waste?
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);
let totPairs = 0, mergedPairs = 0;
for (const f of process.argv.slice(2)) {
  const w = fs.readFileSync(f, 'utf8');
  const sec = w.indexOf('§'), pil = sec >= 0 ? w.indexOf('¶', sec) : -1;
  const body = pil >= 0 ? w.slice(pil + 1) : '';
  const chars = [...body];
  let pairs = 0, merged = 0;
  for (let i = 0; i + 1 < chars.length; i++) {
    const a = chars[i].codePointAt(0)!, b = chars[i + 1].codePointAt(0)!;
    if (a > 127 && b > 127) { pairs++; if (ct(chars[i] + chars[i + 1]) === 1) merged++; }
  }
  totPairs += pairs; mergedPairs += merged;
  console.log(f.split('/').pop()!.replace('.wire.txt', '').padEnd(14),
    `adjacent glyph pairs=${String(pairs).padStart(4)} already-1-token=${String(merged).padStart(4)}`);
}
console.log(`\nTOTAL adjacent glyph pairs ${totPairs}, of which already a single token: ${mergedPairs} (${(100*mergedPairs/Math.max(1,totPairs)).toFixed(1)}%)`);
console.log(`=> headroom if EVERY adjacent pair merged: ${totPairs - mergedPairs} tokens`);
