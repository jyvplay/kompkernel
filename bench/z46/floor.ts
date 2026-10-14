// Z46: copy-floor — LZ77 phrase count over the o200k token sequence (greedy longest previous match, min match 2).
// Any codec whose only mechanism is copying earlier material needs at least one wire token per phrase
// (the literal phrases' tokens plus one reference per copied phrase); DAEDALUS's M is compared with that bound.
import fs from 'node:fs';
import { encodeIds } from '../../src/lib/omega/bpe';
function lz77(ids: number[]): { phrases: number; literals: number; copies: number; copiedTokens: number } {
  const n = ids.length; let i = 0, phrases = 0, literals = 0, copies = 0, copiedTokens = 0;
  // index of positions by first token for speed
  const pos = new Map<number, number[]>();
  while (i < n) {
    let best = 0;
    const cands = pos.get(ids[i]) || [];
    for (let c = cands.length - 1; c >= 0 && c >= cands.length - 4000; c--) {
      const j = cands[c]; let k = 0;
      while (i + k < n && ids[j + k] === ids[i + k]) k++;
      if (k > best) best = k;
    }
    const step = best >= 2 ? best : 1;
    for (let k = 0; k < step; k++) { const l = pos.get(ids[i + k]); if (l) l.push(i + k); else pos.set(ids[i + k], [i + k]); }
    if (best >= 2) { copies++; copiedTokens += best; } else literals++;
    phrases++; i += step;
  }
  return { phrases, literals, copies, copiedTokens };
}
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) as { file: string; D: number }[];
console.log('file\traw\tlz77 phrases\tliterals\tcopies\tD\tD/phrases');
for (const r of rows) {
  const ids = encodeIds(fs.readFileSync(r.file, 'utf8'), 'o200k_base');
  const z = lz77(ids);
  console.log(`${r.file.split('/').pop()}\t${ids.length}\t${z.phrases}\t${z.literals}\t${z.copies}\t${r.D}\t${(r.D / z.phrases).toFixed(2)}`);
}
