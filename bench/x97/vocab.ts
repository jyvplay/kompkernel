/**
 * X97 — VOCABULARY DENSITY CENSUS.  The transliteration hypothesis: all 29 lanes are pure ASCII
 * (bench/x97/receipts/census.json), and ASCII costs ~1 token per character in o200k.  If some
 * script has many vocabulary tokens made ENTIRELY of its own characters, a bijective
 * transliteration of the payload into that script could beat 1 token/char -- a lever no codec in
 * this stack has ever pulled, because every one of them keeps the payload in ASCII and spends its
 * freedom on the rule tape instead.
 *
 * `tokenStrings` takes text, not ids, so the vocabulary is enumerated through `decodeIds([id])`.
 * A byte-fallback / partial-UTF8 token decodes to a lone surrogate or U+FFFD and is discarded.
 */
import { decodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
// find the largest decodable id by doubling
let hi = 1;
while (true) { try { decodeIds([hi], enc); hi *= 2; if (hi > 1 << 22) break; } catch { break; } }
let lo = hi / 2;
while (lo + 1 < hi) { const mid = (lo + hi) >> 1; try { decodeIds([mid], enc); lo = mid; } catch { hi = mid; } }
const N = lo + 1;
console.log(`vocabulary ids decodable: 0..${lo}  (N=${N})`);

const scripts = CHIRON_SCRIPTS.map(s => ({ name: s.name, ranges: s.ranges ?? [[s.lo, s.hi]] }));
const inScript = (cp: number, ranges: Array<[number, number]>): boolean => {
  for (const [a, b] of ranges) if (cp >= a && cp < b) return true;
  return false;
};
const stats = new Map<string, number[]>();
const bump = (k: string, i: number): void => { const a = stats.get(k) ?? [0, 0, 0, 0, 0]; a[i]++; stats.set(k, a); };

for (let id = 0; id < N; id++) {
  let s: string;
  try { s = decodeIds([id], enc); } catch { continue; }
  if (!s) continue;
  const cps = [...s].map(c => c.codePointAt(0)!);
  if (cps.some(c => c === 0xFFFD || (c >= 0xD800 && c <= 0xDFFF))) continue;  // byte-fallback residue
  const L = cps.length;
  const bucket = L === 1 ? 0 : L === 2 ? 1 : L === 3 ? 2 : L === 4 ? 3 : 4;
  // pure ASCII?
  if (cps.every(c => c >= 0x20 && c < 0x7F)) bump('ASCII-printable', bucket);
  for (const sc of scripts) if (cps.every(c => inScript(c, sc.ranges))) bump(sc.name, bucket);
}
console.log(`\n${'script'.padEnd(12)} ${'1-char'.padStart(8)} ${'2-char'.padStart(8)} ${'3-char'.padStart(8)} ${'4-char'.padStart(8)} ${'5+'.padStart(8)}`);
const keys = ['ASCII-printable', ...scripts.map(s => s.name)];
for (const k of keys) {
  const a = stats.get(k) ?? [0, 0, 0, 0, 0];
  console.log(`${k.padEnd(12)} ${String(a[0]).padStart(8)} ${String(a[1]).padStart(8)} ${String(a[2]).padStart(8)} ${String(a[3]).padStart(8)} ${String(a[4]).padStart(8)}`);
}
console.log(`\n(5+ is capped at "4-char" bucket label only for printing; a[4] counts length>=5)`);
