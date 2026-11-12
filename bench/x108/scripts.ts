/**
 * X108 — THE SCRIPT-SELECTION LEVER, MEASURED.
 *
 * chiron.ts:1591 picks the glyph script by COLLISION COUNT ONLY:
 *
 *   const scripts = [...CHIRON_SCRIPTS].sort((a, b) => {
 *     const ca = [...new Set(text)].filter(ch => chironInScript(a, ch.codePointAt(0)!)).length;
 *     const cb = ...;
 *     return ca - cb;
 *   });
 *   const script = scripts[0];
 *
 * Merge density — how many two-character strings from the pool are a SINGLE token —
 * is never consulted, even though the source comments record that CJK was appended
 * "for its 2415 two-character single tokens" and POLYGLOT "carries 3420 two-character
 * single tokens — ten times the merge density of CJK at a usable size".
 *
 * The emitted wires use Cyrillic.  If a run of k glyphs costs fewer tokens under
 * POLYGLOT than under Cyrillic, then the script choice is leaving tokens on the table
 * on every lane, and the fix is to price the script instead of counting collisions.
 *
 * THIS PROVEÑS NOTHING ABOUT THE CHAIN — it measures the tokenizer only, which is the
 * whole mechanism.  What it can prove is the per-glyph cost of each pool.
 */
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';

/** Pool of one-token characters for a script, mirroring chiron's scriptPool. */
function pool(lo: number, hi: number, ranges?: Array<[number, number]>): string[] {
  const spans = ranges ?? [[lo, hi] as [number, number]];
  const out: string[] = [];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (countTokens(ch, enc) === 1) out.push(ch);
    }
  }
  return out;
}

console.log('script        pool  pairMerge%  run40tok  run100tok  tok/glyph(run100)');
const results: any[] = [];
for (const s of CHIRON_SCRIPTS) {
  const p = pool(s.lo, s.hi, s.ranges);
  if (p.length < 8) { console.log(`${s.name.padEnd(12)} pool ${p.length} — too small to test`); continue; }
  // sample adjacent pairs within the pool (the pool order is code-point order, which
  // is what chiron's assignment walks)
  let merged = 0, tested = 0;
  const step = Math.max(1, Math.floor(p.length / 200));
  for (let i = 0; i + 1 < p.length; i += step) {
    tested++;
    if (countTokens(p[i]! + p[i + 1]!, enc) === 1) merged++;
  }
  // a run of glyphs as chiron would emit one: consecutive pool members
  const run40 = p.slice(0, 40).join('');
  const run100 = p.slice(0, 100).join('');
  const t40 = countTokens(run40, enc), t100 = countTokens(run100, enc);
  const r = { name: s.name, pool: p.length, mergePct: +(100 * merged / Math.max(1, tested)).toFixed(1), run40: t40, run100: t100, perGlyph: +(t100 / 100).toFixed(3) };
  results.push(r);
  console.log(`${s.name.padEnd(12)} ${String(p.length).padStart(4)} ${(100 * merged / Math.max(1, tested)).toFixed(1).padStart(9)}% ${String(t40).padStart(10)} ${String(t100).padStart(11)} ${(t100 / 100).toFixed(3).padStart(16)}`);
}
// which script does chiron's collision sort pick for typical ASCII source text?
const ascii = 'the quick brown fox jumps over the lazy dog 0123456789\n';
const sorted = [...CHIRON_SCRIPTS].sort((a, b) => {
  const ca = [...new Set(ascii)].filter((ch) => chironInScript(a, ch.codePointAt(0)!)).length;
  const cb = [...new Set(ascii)].filter((ch) => chironInScript(b, ch.codePointAt(0)!)).length;
  return ca - cb;
});
console.log(`\ncollision-sorted first script for pure-ASCII source: ${sorted[0]!.name}  (all collision counts are 0, so the sort is stable and the declaration order wins)`);
console.log(`\nIf the emitted wire uses a different script, something downstream overrides it — check the tape's first character.`);
import * as fs from 'node:fs';
