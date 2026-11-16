/** X122 — the merge graph of the glyph pool: which ordered pairs of exotic-script
 *  characters tokenize to a SINGLE o200k token? Feeds merge-aware symbol assignment. */
import { encodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironGlyphs } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const pool: string[] = [];
const seen = new Set<string>();
for (const s of CHIRON_SCRIPTS) {
  for (const ch of chironGlyphs(s)) {
    if (seen.has(ch) || [...ch].length !== 1) continue;
    if (encodeIds(ch, enc).length !== 1) continue;
    seen.add(ch); pool.push(ch);
  }
}
console.log(`pool: ${pool.length} single-token glyph characters`);
const n = Math.min(pool.length, 220);
const P = pool.slice(0, n);
const deg = new Array(n).fill(0);
let edges = 0; const samples: string[] = [];
let t0 = Date.now();
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n; j++) {
    if (encodeIds(P[i]! + P[j]!, enc).length === 1) { deg[i]++; edges++; if (samples.length < 25) samples.push(P[i]! + P[j]!); }
  }
}
console.log(`pairs tested ${n * n} in ${Date.now() - t0} ms; merging pairs ${edges} (${(edges / (n * n) * 100).toFixed(2)}%)`);
const ds = [...deg].sort((a, b) => a - b);
console.log(`out-degree: min ${ds[0]} p25 ${ds[(n * 0.25) | 0]} median ${ds[(n / 2) | 0]} p75 ${ds[(n * 0.75) | 0]} p90 ${ds[(n * 0.9) | 0]} max ${ds[n - 1]}`);
console.log(`orphans (deg 0): ${deg.filter((d) => d === 0).length}`);
console.log(`samples: ${samples.join(' ')}`);
