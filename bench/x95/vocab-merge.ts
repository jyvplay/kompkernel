/**
 * X95 — THE VOCABULARY-LEVEL CEILING ON GLYPH MERGING, MEASURED EXACTLY.
 *
 * THE CLAIM UNDER TEST. METATHESIS saturated glyph relabelling at -14 tokens over 7 864 and its
 * receipt records the 638-token "unmerged adjacent glyph pair" headroom as UNACHIEVABLE, because
 * "merging is a property of the vocabulary, not the assignment". That is a statement about
 * o200k_base, and it was reached by searching assignments. This probe goes at the same statement
 * from the other end: it enumerates the vocabulary itself and asks how many tokens consist of two
 * or more non-ASCII characters, i.e. how many adjacent-glyph merges the tokenizer will actually
 * perform, and which glyph sets make them densest.
 *
 * WHY IT MATTERS AT ALL. References are the largest cost centre in the message -- 3 222 of 7 864
 * tokens, 41 %, at a measured mean of ~0.801 tokens per glyph. If a glyph alphabet existed in
 * which adjacent pairs frequently encode to ONE token, the mean could fall toward 0.5 and the
 * prize would be ~970 tokens over the ten committed wires, 12 % of the message. That is an order
 * of magnitude larger than anything found since X90, and it is a general gain (every lane has a
 * body full of references) rather than a lane-specific one.
 *
 * THE TEST IS DECISIVE IN BOTH DIRECTIONS. If the count of multi-glyph tokens is near zero, the
 * refs centre has a hard floor of ~1 token per reference and the whole relabelling lever family is
 * closed by the tokenizer rather than by search effort. If it is large, METATHESIS's saturation is
 * a property of its search and there is a real arm to build.
 *
 * ZERO frontier calls. One vocabulary scan, no encodes of any lane.
 */
import { decodeIds, countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const LIMIT = Number(process.env.X95_LIMIT ?? 200100);

const t0 = Date.now();
const nonAsciiMulti: { id: number; s: string; chars: string[] }[] = [];
let scanned = 0, failures = 0;
for (let id = 0; id < LIMIT; id++) {
  let s: string;
  try { s = decodeIds([id], ENC); } catch { failures++; continue; }
  scanned++;
  const chars = [...s];
  if (chars.length < 2) continue;
  let all = true;
  for (const c of chars) if (c.codePointAt(0)! <= 127) { all = false; break; }
  if (all) nonAsciiMulti.push({ id, s, chars });
}
const ms = Date.now() - t0;

// which blocks do the mergeable glyphs live in, and how dense are the pairs?
function block(cp: number): string {
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0500 && cp <= 0x052f) return 'CyrillicSup';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  if (cp >= 0x0590 && cp <= 0x05ff) return 'Hebrew';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0x3040 && cp <= 0x30ff) return 'Kana';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'Hangul';
  if (cp >= 0x2c00 && cp <= 0x2c5f) return 'Glagolitic';
  if (cp >= 0xa640 && cp <= 0xa69f) return 'CyrillicExtB';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x0e00 && cp <= 0x0e7f) return 'Thai';
  if (cp >= 0x2580 && cp <= 0x259f) return 'BlockEl';
  if (cp >= 0x2190 && cp <= 0x21ff) return 'Arrows';
  if (cp >= 0x2200 && cp <= 0x22ff) return 'MathOps';
  if (cp >= 0x1d400 && cp <= 0x1d7ff) return 'MathAlpha';
  if (cp >= 0x13000 && cp <= 0x1342f) return 'Egyptian';
  if (cp >= 0x20000) return 'SMP-high';
  return 'U+' + cp.toString(16).slice(0, 2) + 'xx';
}
const byBlock = new Map<string, number>();
const pairCount = new Map<string, number>();
const glyphFreq = new Map<string, number>();
for (const t of nonAsciiMulti) {
  const b = t.chars.map(c => block(c.codePointAt(0)!)).join('+');
  byBlock.set(b, (byBlock.get(b) ?? 0) + 1);
  for (const c of t.chars) glyphFreq.set(c, (glyphFreq.get(c) ?? 0) + 1);
  for (let i = 0; i + 2 <= t.chars.length; i++) {
    const p = t.chars[i] + t.chars[i + 1];
    pairCount.set(p, (pairCount.get(p) ?? 0) + 1);
  }
}
// THE DECISIVE NUMBER: the densest mergeable glyph set. Greedily take the glyphs that appear in
// the most mergeable tokens, then measure what a run of them actually costs.
const ranked = [...glyphFreq.entries()].sort((a, b) => b[1] - a[1]);
const L: string[] = [];
L.push(`ENCODING ${ENC}   ids scanned ${scanned} (limit ${LIMIT}, decode failures ${failures})   scan ${ms} ms`);
L.push(`vocabulary tokens made of >=2 non-ASCII characters: ${nonAsciiMulti.length}`);
L.push(`distinct adjacent non-ASCII pairs that are ONE token: ${pairCount.size}`);
L.push('');
L.push('top block combinations of mergeable tokens:');
for (const [b, n] of [...byBlock.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) L.push('  ' + b.padEnd(28) + String(n).padStart(6));
L.push('');
L.push('the 20 glyphs that appear in the most mergeable tokens:');
for (const [g, n] of ranked.slice(0, 20)) L.push(`  ${g}  U+${g.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}  ${block(g.codePointAt(0)!).padEnd(14)} ${String(n).padStart(5)}`);

// empirical: what does a run of the top-K mergeable glyphs actually cost?
L.push('');
L.push('EMPIRICAL RUN COST using the top-K most mergeable glyphs (the ceiling on the relabelling lever):');
L.push('  K   runTokens  tok/glyph   control: K distinct Latin letters tok/glyph');
for (const K of [4, 8, 16, 32, 64, 128]) {
  const glyphs = ranked.slice(0, K).map(x => x[0]);
  if (glyphs.length < K) continue;
  // a realistic body-like run: each glyph twice, in ranked order, no separators
  const run = glyphs.join('');
  const t = countTokensExact(run, ENC);
  const ctrl = countTokensExact('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, K), ENC);
  L.push(`  ${String(K).padStart(4)} ${String(t).padStart(10)}  ${(t / K).toFixed(4).padStart(10)}   ${String(ctrl).padStart(6)}  ${(ctrl / K).toFixed(4)}`);
}
// and the same for the glyph pool the shipped wires actually use, as the incumbent baseline
const wires = fs.readdirSync('bench/x87/receipts/wires').filter(f => f.endsWith('.wire.txt'));
const used = new Map<string, number>();
for (const f of wires) {
  const w = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const sec = w.indexOf('§'), pil = w.indexOf('¶', sec);
  const tape = w.slice(sec + 1, pil);
  const seen = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); used.set(ch, (used.get(ch) ?? 0) + 1); }
}
const usedGlyphs = [...used.keys()];
L.push('');
L.push(`INCUMBENT: the ten shipped wires use ${usedGlyphs.length} distinct glyphs in total.`);
const incRun = usedGlyphs.join('');
const incTok = countTokensExact(incRun, ENC);
L.push(`  all ${usedGlyphs.length} concatenated (one occurrence each): ${incTok} tokens = ${(incTok / usedGlyphs.length).toFixed(4)} tok/glyph`);
const bestRun = ranked.slice(0, usedGlyphs.length).map(x => x[0]).join('');
const bestTok = countTokensExact(bestRun, ENC);
L.push(`  the ${usedGlyphs.length} MOST MERGEABLE glyphs in the vocabulary, same test: ${bestTok} tokens = ${(bestTok / usedGlyphs.length).toFixed(4)} tok/glyph`);
L.push(`  headroom if relabelling could reach the vocabulary optimum: ${incTok - bestTok} tokens on a ${usedGlyphs.length}-glyph run`);
L.push('');
L.push('VERIFICATION of the merge claim: each reported pair is re-encoded and must return exactly 1 token.');
let verified = 0, refuted = 0;
for (const [p] of [...pairCount.entries()].slice(0, 400)) { const n = countTokensExact(p, ENC); if (n === 1) verified++; else refuted++; }
L.push(`  pairs re-encoded: ${verified + refuted}   encoded to exactly 1 token: ${verified}   more than 1: ${refuted}`);
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/vocab-merge.json', JSON.stringify({
  encoding: ENC, scanned, failures, scanMs: ms, multiGlyphTokens: nonAsciiMulti.length,
  distinctMergeablePairs: pairCount.size,
  byBlock: [...byBlock.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
  topGlyphs: ranked.slice(0, 60).map(([g, n]) => ({ g, cp: 'U+' + g.codePointAt(0)!.toString(16).toUpperCase(), block: block(g.codePointAt(0)!), n })),
  incumbentGlyphs: usedGlyphs.length, incumbentRunTokens: incTok, bestRunTokens: bestTok,
  pairReencode: { verified, refuted },
  samples: nonAsciiMulti.slice(0, 40).map(t => ({ id: t.id, s: t.s })),
}, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/vocab-merge.log', log);
console.log(log);
