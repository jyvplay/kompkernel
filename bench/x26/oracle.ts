/**
 * X26 oracle: how much does a PROPER phrase grammar leave on the table for prose?
 *
 * Model. Replacing c non-overlapping occurrences of an L-token phrase with one
 * glyph changes the token count by
 *
 *     delta = (L + 1) - (c*L - c)          [tape entry L+1, body c glyphs vs c*L]
 *
 * ignoring the fact that a glyph's marginal cost in context measured 0.80, not
 * 1.00 (bench/x25/marg.ts). With the measured marginal cost m:
 *
 *     delta = (L + 1) - c*(L - m)
 *
 * POLYTROPOS searches greedily under a time budget. This probe does the same
 * thing WITHOUT the budget, on the exact token sequence, re-deriving counts
 * after every accepted replacement, and reports the total it reaches. The gap
 * between it and POLYTROPOS is what a better search alone would buy.
 *
 * It is an ORACLE: it is not shippable (it needs the token sequence at decode
 * time, and it emits no contract). It exists to bound the opportunity.
 */
import fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const M = +(process.env.M || '0.80');   // measured marginal glyph cost
const LMAX = +(process.env.LMAX || '10');
const ROUNDS = +(process.env.ROUNDS || '400');

function bestPhrase(ids: number[], counts: Map<string, number>) {
  let best: { gain: number; key: string; len: number; cnt: number } | null = null;
  for (const [key, cnt] of counts) {
    const L = key.split(' ').length;
    if (L < 2) continue;
    const gain = cnt * (L - M) - (L + 1);
    if (gain <= 0) continue;
    if (!best || gain > best.gain) best = { gain, key, len: L, cnt };
  }
  return best;
}

function apply(ids: number[], key: string, glyph: number): number[] {
  const pat = key.split(' ').map(Number);
  const out: number[] = [];
  for (let i = 0; i < ids.length; ) {
    let ok = true;
    for (let k = 0; k < pat.length; k++) if (ids[i + k] !== pat[k]) { ok = false; break; }
    if (ok) { out.push(glyph); i += pat.length; }
    else { out.push(ids[i]); i++; }
  }
  return out;
}

function counts(ids: number[], LMAX: number) {
  const c = new Map<string, number>();
  for (let L = 2; L <= LMAX; L++)
    for (let i = 0; i + L <= ids.length; i++)
      { const k = ids.slice(i, i + L).join(' '); c.set(k, (c.get(k) ?? 0) + 1); }
  // drop phrases whose occurrences overlap: keep only non-overlapping leftmost hits
  const fixed = new Map<string, number>();
  for (const [k, v] of c) {
    if (v < 2) continue;
    const pat = k.split(' ').map(Number);
    let n = 0;
    for (let i = 0; i + pat.length <= ids.length; ) {
      let ok = true;
      for (let t = 0; t < pat.length; t++) if (ids[i + t] !== pat[t]) { ok = false; break; }
      if (ok) { n++; i += pat.length; } else i++;
    }
    if (n >= 2) fixed.set(k, n);
  }
  return fixed;
}

const files = (process.env.F || '').split(',').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const base = T(t);
  let ids = [...(tokenStrings ? [] : [])] as number[];
  // use the real id sequence
  const { encodeIds } = require('@/lib/omega/bpe') as any;
  ids = Array.from(encodeIds(t, enc)) as number[];
  let glyph = -1;                       // negative ids stand in for glyphs
  let tapeCost = 0;
  let bodyCost = ids.length;
  const t0 = Date.now();
  for (let r = 0; r < ROUNDS; r++) {
    const c = counts(ids, LMAX);
    const b = bestPhrase(ids, c);
    if (!b) break;
    ids = apply(ids, b.key, glyph--);
    tapeCost += b.len + 1;
    bodyCost = ids.length;
  }
  const total = tapeCost + bodyCost;
  console.log(
    f.split('/').pop()!.padEnd(40),
    'base', String(base).padStart(5),
    '| oracle body', String(bodyCost).padStart(5),
    'tape', String(tapeCost).padStart(4),
    '=> ', String(total).padStart(5),
    '| saved', String(base - total).padStart(5),
    `(${((base - total) / base * 100).toFixed(1)}%)`,
    `${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}
