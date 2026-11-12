/**
 * X109 — THE MULTI-CHARACTER GLYPH LEVER, MEASURED.
 *
 * ΧΕΙΡΩΝ's `scriptPool` keeps only ONE-character glyphs:
 *
 *     for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp);
 *       if (countTokens(ch, enc) === 1) out.push(ch); }
 *
 * ARIADNE's header prices 1-char glyph runs at 0.864 tokens/char (best case).  But
 * o200k contains multi-CHARACTER single tokens inside one script, so a rule could be
 * named by a TWO-character glyph that is itself one token — and two adjacent such
 * glyphs may form a FOUR-character single token, i.e. two rule references for one
 * token.  That would halve the per-reference cost.
 *
 * This probe scans the live vocabulary and builds, per script:
 *   L1 = # 1-char single tokens, and the 1-char pair-merge graph
 *   L2 = # 2-char single tokens, and the 2-char pair-merge graph (edges = # 4-char
 *        single tokens whose two halves are both single tokens)
 * and reports the merge density of each, which is what decides whether the mechanism
 * has legs.
 */
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
import { createRequire } from 'node:module';
const enc: EncodingName = 'o200k_base';
// Reach the same decoder the library uses, through the package's own entry point,
// so the scan sees exactly the vocabulary countTokens sees.
const req = createRequire(import.meta.url);
const gpt: any = req('gpt-tokenizer');
const decodeFn: (ids: number[]) => string = (ids) => gpt.decode(ids);
const SCAN_LIMIT = 200_000;

/** Every vocabulary token of exactly `len` characters, all inside one script's ranges. */
function scan(len: number, ranges: Array<[number, number]>): string[] {
  const out: string[] = [];
  for (let id = 0; id < SCAN_LIMIT; id++) {
    let s: string;
    try { s = decodeFn([id]); } catch { continue; }
    if (s.length !== len) continue;
    let ok = true;
    for (let i = 0; i < len; i++) {
      const c = s.codePointAt(i)!;
      if (!ranges.some(([a, b]) => c >= a && c < b)) { ok = false; break; }
    }
    if (ok) out.push(s);
  }
  return out;
}

for (const sc of CHIRON_SCRIPTS) {
  const name = sc.name;
  const ranges = sc.ranges ?? [[sc.lo, sc.hi] as [number, number]];
  const t0 = Date.now();
  const l1 = scan(1, ranges);
  const l2 = scan(2, ranges);
  const l3 = scan(3, ranges);
  const l4 = scan(4, ranges);
  // 1-char merge graph
  const s1 = new Set(l1);
  let e1 = 0;
  for (const a of l1) for (const b of l1) if (s1.has(a) && s1.has(b) && countTokens(a + b, enc) === 1) e1++;
  // 2-char merge graph: a 4-char token whose halves are both single tokens
  const s2 = new Set(l2);
  let e2 = 0, halfOk = 0;
  for (const q of l4) {
    const h1 = q.slice(0, 2), h2 = q.slice(2);
    if (s2.has(h1) && s2.has(h2)) { halfOk++; e2++; }
  }
  const deg1 = l1.length ? e1 / l1.length : 0;
  const deg2 = l2.length ? e2 / l2.length : 0;
  console.log(`${name.padEnd(9)} 1char=${String(l1.length).padStart(5)} 2char=${String(l2.length).padStart(5)} 3char=${String(l3.length).padStart(5)} 4char=${String(l4.length).padStart(5)}  |  1-char merge edges ${String(e1).padStart(6)} (deg ${deg1.toFixed(1)})  |  2-char merge edges ${String(e2).padStart(5)} (deg ${deg2.toFixed(2)})  [${Date.now() - t0} ms]`);
}
console.log('\nA 2-char merge edge means TWO rule references cost ONE token. Compare with the');
console.log('1-char graph, where an edge means the same. The question is the DENSITY: with');
console.log('degree d over N glyphs, a run of k references can be paired off far more often.');
