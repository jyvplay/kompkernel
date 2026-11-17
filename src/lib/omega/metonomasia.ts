/**
 * src/lib/omega/metonomasia.ts
 * =============================================================================
 * X130 — ΜΕΤΟΝΟΜΑΣΊΑ (metonomasia, "renaming"): PERMUTE the frontier's
 *        dictionary glyphs within their own alphabet so that more adjacent
 *        glyph pairs merge into single tokens.
 *
 * WHAT THE MEASUREMENTS SHOWED, AND WHAT THEY REFUTED.
 *
 *  (a) The frontier output contains ZERO remaining repeated-token n-grams
 *      (bench/x129/receipts/x130-residual.log). The dictionary layer is
 *      exhausted; another dictionary pass has nothing to find.
 *
 *  (b) A dictionary's glyph->value binding is ARBITRARY, so renaming is
 *      semantics-preserving — unlike X129, which substituted new glyphs into the
 *      SOURCE and thereby destroyed the whitespace runs, column alignment and
 *      identifier substrings that ΣΤΉΛΗ / ΣΤΟΙΧΗΔΌΝ / ΒΈΛΤΙΣΤΟΣ exploit
 *      (+2190 composed). Renaming edits nothing those codecs read.
 *
 *  (c) The first hypothesis — "the shipped alphabet cannot merge, so move to
 *      Hebrew/Arabic (42.7 % / 34.5 % pair-merge)" — is REFUTED BY MEASUREMENT.
 *      That rate was sampled from the first 40 codepoints of 0x0386..0x044f,
 *      which is the GREEK half. The glyphs actually in use come from
 *      merismos.ts:84, which lists CYRILLIC FIRST, and Cyrillic bigrams are
 *      common Russian sequences that o200k already merges:
 *
 *          kb-article: 71 of 82 adjacent glyph pairs ALREADY merge.
 *
 *      Swapping in a Hebrew/Arabic alphabet scored 59/82 and cost +63 tokens.
 *      Recorded here because it is the measurement that kills the idea.
 *
 * THE VERSION THAT SURVIVES. Keep the alphabet; change only WHICH rule gets
 * which letter. Adjacent-pair merging is already ~86 %, so the remaining headroom
 * is the misses — but a permutation search also finds triples: three glyphs that
 * form one token save two tokens, and that is invisible to any pair count.
 *
 * SAFETY BY CONSTRUCTION. The search starts from the IDENTITY permutation, i.e.
 * the shipped message, and only accepts a strict improvement measured with the
 * real `countTokens` on the whole rebuilt message. It therefore cannot regress a
 * lane: the worst case is the unmodified frontier output.
 *
 * EXACTNESS. The renaming is a bijection on the glyph set, so undoing it
 * reproduces the frontier message character for character. `metonomasiaEncode`
 * performs that inverse and throws unless it recovers `tagstackEncode(text)`
 * exactly; the frontier guarantees `decoded === source`, and the two compose.
 *
 * NOT GREEDY in the substitution sense — no substring is ever mined, ranked or
 * replaced. It is a JOINT assignment (swap/move hill-climb over a weighted
 * adjacency graph), because which partner a glyph merges with depends on every
 * other assignment. CPU-bound: the cost is `countTokens` probes.
 * ----------------------------------------------------------------------------
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode } from './tagstack';

/** The stack's glyph alphabet (must match aeon.ts:38 / merismos.ts:84). */
const GLYPH_LO = 0x0386;
const GLYPH_HI = 0x04ff;

let POOL: string[] | null = null;
let MERGE = new Map<string, boolean>();

function isGlyphCh(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return c >= GLYPH_LO && c <= GLYPH_HI;
}

function pool(enc: EncodingName): string[] {
  if (POOL) return POOL;
  const out: string[] = [];
  for (let cp = GLYPH_LO; cp <= GLYPH_HI; cp++) {
    const c = String.fromCodePoint(cp);
    try { if (countTokens(c, enc) === 1) out.push(c); } catch { /* skip */ }
  }
  POOL = out;
  return out;
}

/** Does the pair (a,b) cost a single token? Probed with the real counter. */
function merges(a: string, b: string, enc: EncodingName): boolean {
  const k = a + b;
  let v = MERGE.get(k);
  if (v === undefined) { v = countTokens(k, enc) === 1; MERGE.set(k, v); }
  return v;
}

export interface MetonomasiaResult {
  message: string;
  /** Undo the renaming; the result is the plain frontier message. */
  toFrontier: (m: string) => string;
  rules: number;
  /** Adjacent glyph pairs that merge into one token, after / before. */
  mergedAfter: number;
  mergedBefore: number;
  tokens: number;
  baseTokens: number;
}

/**
 * Permute the frontier's glyphs for better adjacency merging. Returns null when
 * the frontier has no tape or when no strict improvement is found — in which
 * case the caller should emit the unmodified frontier message.
 */
export function metonomasiaEncode(text: string, enc: EncodingName = 'o200k_base'): MetonomasiaResult | null {
  if (metonomasiaDisabled()) return null;
  const base = tagstackEncode(text, enc) as unknown as { message: string; messageTokens: number; decoded: string };
  const M = base.message;
  const i1 = M.indexOf('\u00a7');
  if (i1 < 0) return null;                       // frontier emitted no tape
  const i2 = M.indexOf('\u00b6', i1);
  const tape = i2 < 0 ? M.slice(i1) : M.slice(i1, i2);

  // Parse the tape: the FIRST occurrence of a glyph starts its rule; later
  // occurrences of an already-defined glyph are back-references inside a value.
  const defined: string[] = [];
  const seen = new Set<string>();
  for (const ch of tape) {
    if (!isGlyphCh(ch) || seen.has(ch)) continue;
    seen.add(ch); defined.push(ch);
  }
  if (defined.length < 2) return null;
  const gset = new Set(defined);

  // Any other character already in the message must not be collided with.
  const occupied = new Set<string>();
  for (const ch of M) if (!gset.has(ch)) occupied.add(ch);

  // The pool is the alphabet itself, plus any unused letter of the same scripts.
  const spare = pool(enc).filter((c) => !occupied.has(c) && !gset.has(c));
  const letters = [...defined, ...spare];
  const n = defined.length;

  // Weighted adjacency of glyph pairs over the WHOLE message.
  const idx = new Map<string, number>();
  defined.forEach((g, i) => idx.set(g, i));
  const w = new Map<number, Map<number, number>>();
  let pairsTotal = 0;
  for (let i = 0; i + 1 < M.length; i++) {
    const a = idx.get(M[i]!), b = idx.get(M[i + 1]!);
    if (a === undefined || b === undefined) continue;
    let m = w.get(a); if (!m) { m = new Map(); w.set(a, m); }
    m.set(b, (m.get(b) ?? 0) + 1);
    pairsTotal++;
  }
  if (pairsTotal === 0) return null;

  // assign[i] = letter standing for rule i. Start at IDENTITY = shipped message.
  let assign: string[] = [...defined];
  const inUse = new Set(assign);

  const mergedWeight = (as: string[]): number => {
    let s = 0;
    for (const [a, m] of w) for (const [b, c] of m) if (merges(as[a]!, as[b]!, enc)) s += c;
    return s;
  };
  const build = (as: string[]): string => {
    let out = '';
    for (const ch of M) { const i = idx.get(ch); out += (i !== undefined) ? as[i]! : ch; }
    return out;
  };

  const mergedBefore = mergedWeight(assign);

  // ---------------------------------------------------------------------------
  // TARGETED MISS REPAIR, scored with the REAL counter.
  //
  // The proxy above is not the objective: a pair that merges in isolation can
  // still be split by its context, and triples are invisible to a pair count.
  // So the search works directly on `countTokens` of the whole rebuilt message.
  // It touches only the pairs that currently FAIL to merge (the misses), which
  // keeps the candidate count low enough to afford a real measurement each time.
  //
  // The identity permutation is the starting point, so the shipped message is
  // the floor: every accepted step is a strict, measured improvement.
  // ---------------------------------------------------------------------------
  const deadline = Date.now() + (Number(process.env?.OMEGA_METONOMASIA_MS ?? 25000));
  let bestAs = [...assign];
  let bestTok = base.messageTokens;

  const measure = (as: string[]): number => countTokens(build(as), enc);

  // misses: adjacent glyph pairs that do not merge, heaviest first
  const misses: Array<{ a: number; b: number; w: number }> = [];
  for (const [a, m] of w) for (const [b, c] of m) if (!merges(assign[a]!, assign[b]!, enc)) misses.push({ a, b, w: c });
  misses.sort((x, y) => y.w - x.w);

  const spares = spare.slice(0, 96);
  let evals = 0;
  for (let round = 0; round < 3 && Date.now() < deadline; round++) {
    let improved = false;
    const work = misses.slice(0, 96);
    for (const { a, b } of work) {
      if (Date.now() > deadline) break;
      // try re-lettering each side of the miss to a spare, and swapping the two
      const tries: Array<[number, string]> = [];
      for (const g of spares) { if (!inUse.has(g)) { tries.push([a, g]); tries.push([b, g]); } }
      tries.push([a, assign[b]!]); tries.push([b, assign[a]!]);
      for (const [i, g] of tries) {
        if (Date.now() > deadline) break;
        const prev = assign[i]!;
        if (g === prev) continue;
        const holder = [...assign];
        // if g belongs to another rule, swap rather than duplicate
        const j = assign.indexOf(g);
        if (j >= 0 && j !== i) holder[j] = prev;
        holder[i] = g;
        const tok = measure(holder); evals++;
        if (tok < bestTok) {
          bestTok = tok; bestAs = holder; assign = holder; improved = true;
          inUse.clear(); for (const x of assign) inUse.add(x);
          break;
        }
      }
    }
    if (!improved) break;
  }

  // Final gate: identity is the floor, so a lane can never regress.
  const cands: string[][] = [[...defined], bestAs];
  let outTok = base.messageTokens, bestOut: string | null = null, bestMerged = mergedBefore;
  for (const as of cands) {
    const out = build(as);
    const tok = countTokens(out, enc);
    if (tok < outTok) { outTok = tok; bestOut = out; bestMerged = mergedWeight(as); }
  }
  if (bestOut === null) return null;

  // Exactness: inverting the chosen permutation must restore the frontier msg.
  const chosen = bestMerged === mergedBefore && bestTok === base.messageTokens ? [...defined] : bestAs;
  const back = new Map<string, string>();
  for (let i = 0; i < n; i++) back.set(chosen[i]!, defined[i]!);
  const toFrontier = (m: string): string => {
    let out = '';
    for (const ch of m) out += back.get(ch) ?? ch;
    return out;
  };
  if (toFrontier(bestOut) !== M) throw new Error('ΜΕΤΟΝΟΜΑΣΊΑ: renaming is not invertible');
  if (base.decoded !== text) throw new Error('ΜΕΤΟΝΟΜΑΣΊΑ: frontier did not reproduce the source');

  return {
    message: bestOut, toFrontier, rules: n,
    mergedAfter: bestMerged, mergedBefore, tokens: bestTok, baseTokens: base.messageTokens,
  };
}

/** Opt out with OMEGA_NO_METONOMASIA=1. */
export function metonomasiaDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_NO_METONOMASIA === '1';
}

/** Drop the probe caches between A/B arms. */
export function metonomasiaResetProbes(): void { MERGE = new Map(); POOL = null; }
