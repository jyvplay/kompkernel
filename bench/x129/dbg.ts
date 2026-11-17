/** X130 debug: is the merge actually happening? verbose trace on one lane. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const GLYPH_LO = 0x0386, GLYPH_HI = 0x044f;
const isG = (c: string) => { const x = c.codePointAt(0)!; return x >= GLYPH_LO && x <= GLYPH_HI; };
const p = process.env.LANE!;
const text = fs.readFileSync(p, 'utf8');
const a: any = tagstackEncode(text, enc);
const M = a.message as string;
const i1 = M.indexOf('\u00a7'), i2 = M.indexOf('\u00b6', i1);
const tape = i2 < 0 ? M.slice(i1) : M.slice(i1, i2);
const defined: string[] = []; const seen = new Set<string>();
for (const ch of tape) { if (!isG(ch) || seen.has(ch)) continue; seen.add(ch); defined.push(ch); }
console.log(`${p}  raw=${countTokens(text, enc)} M=${a.messageTokens}  rules=${defined.length}`);
const idx = new Map(defined.map((g, i) => [g, i] as const));
const pairs: Array<[string, string, number]> = [];
const wmap = new Map<string, number>();
let pairsTotal = 0;
for (let i = 0; i + 1 < M.length; i++) {
  const A = M[i]!, B = M[i + 1]!;
  if (idx.has(A) && idx.has(B)) { wmap.set(A + B, (wmap.get(A + B) ?? 0) + 1); pairsTotal++; }
}
for (const [k, c] of wmap) pairs.push([k[0]!, k[1]!, c]);
pairs.sort((x, y) => y[2] - x[2]);
console.log(`adjacent glyph-glyph pairs: ${pairsTotal} (distinct ${pairs.length})`);
console.log(`top12: ${pairs.slice(0, 12).map(([a, b, c]) => `${JSON.stringify(a + b)}x${c}`).join(' ')}`);
// merge rate of the CURRENT alphabet on these actual pairs
let cur = 0; for (const [a1, b1, c] of pairs) if (countTokens(a1 + b1, enc) === 1) cur += c;
console.log(`pairs already merging in CURRENT alphabet: ${cur}/${pairsTotal}`);
// candidate pool: Hebrew + Arabic + Georgian 1-token chars
const occupied = new Set<string>(); for (const ch of M) if (!idx.has(ch)) occupied.add(ch);
const pool: string[] = [];
for (const [lo, hi] of [[0x05d0, 0x05ea], [0x0621, 0x064a], [0x10d0, 0x10fa]] as const)
  for (let cp = lo; cp <= hi; cp++) { const c = String.fromCodePoint(cp); if (countTokens(c, enc) === 1) pool.push(c); }
const cand = pool.filter((c) => !occupied.has(c));
console.log(`pool=${pool.length} afterOccupiedFilter=${cand.length}`);
// how many of the top pairs COULD merge with some candidate assignment?
let possible = 0;
const used = new Set<string>(); const assign = new Map<string, string>();
for (const [a1, b1, c] of pairs) {
  let done = false;
  if (assign.has(a1) && assign.has(b1)) { if (countTokens(assign.get(a1)! + assign.get(b1)!, enc) === 1) { possible += c; done = true; } }
  if (!done) {
    const ga = assign.get(a1) ?? cand.find((g) => !used.has(g))!;
    if (!assign.has(a1)) { assign.set(a1, ga); used.add(ga); }
    const gb = cand.find((g) => !used.has(g) && countTokens(assign.get(a1)! + g, enc) === 1);
    if (gb) { assign.set(b1, gb); used.add(gb); if (countTokens(assign.get(a1)! + gb, enc) === 1) possible += c; }
    else if (!assign.has(b1)) { const g2 = cand.find((g) => !used.has(g))!; assign.set(b1, g2); used.add(g2); }
  }
}
console.log(`greedy-first-pass mergeable weight: ${possible}/${pairsTotal}  (upper bound on saving)`);
// build the greedy full message and measure for real
let out = '';
for (const ch of M) { const g = assign.get(ch); out += g ?? ch; }
console.log(`greedy rebuilt tokens=${countTokens(out, enc)} vs base ${a.messageTokens}  (exact-invertible=${(() => { const back = new Map([...assign].map(([k, v]) => [v, k])); let r = ''; for (const ch of out) r += back.get(ch) ?? ch; return r === M; })()})`);
