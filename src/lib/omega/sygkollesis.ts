/**
 * src/lib/omega/sygkollesis.ts
 * =============================================================================
 * X129 — ΣΥΓΚΌΛΛΗΣΙΣ (sygkollesis, "a welding together"): JOINT glyph-encoding
 *        of high-frequency SINGLE-TOKEN units so that ADJACENT GLYPHS MERGE.
 *
 * THE ONE-TOKEN IMPOSSIBILITY THIS EXPLOITS AROUND. For a substring v that costs
 * t = countTokens(v) tokens and occurs c times, substituting a rule for it
 * changes the message by
 *
 *      gain  =  c*(t-1)  -  (1 + t)                ... (the one-token floor)
 *
 * — c*(t-1) saved in the body, minus one tape glyph and minus the t tokens the
 * tape spends naming the value. For t = 1 that is -2 for EVERY c: no
 * substitution codec, however clever, can ever profit from a one-token string.
 * Prose is dominated by one-token words, which is exactly why kb-article
 * compresses 5.5 % while the tabular ops lanes reach 75-82 % (measured over the
 * 29 canonical lanes). Every miner in this stack is therefore RIGHT to refuse
 * such rules, and marginal (greedy, one-rule-at-a-time) selection is not a weak
 * implementation of this idea — it provably cannot express it.
 *
 * WHAT THE FLOOR DOES NOT COVER. The floor prices each rule IN ISOLATION. It
 * says nothing about the JOINT effect, because two adjacent glyphs g1 g2 may
 * themselves be a SINGLE TOKEN in the vocabulary, collapsing two references
 * into one. Realised merges are paid for by the rule SET, not by either rule
 * individually, so a set that is negative rule-by-rule can be strongly positive
 * together. That is a genuinely non-marginal (non-greedy) objective, and it is
 * the whole mechanism here.
 *
 *   Opportunity, measured in real o200k token space (bench/x126/receipts/
 *   x129-sygkollesis-tokstats.log): coverage of the top-K tokens and the count
 *   of adjacent glyph-glyph pairs, against a rule cost of 2K — code-ts needs an
 *   11 % merge rate at K=20 and 14 % at K=50; node-help 16 % / 27 %;
 *   kb-article 48 % / 59 %. This is the "superword" / cross-boundary-span effect
 *   that BoundlessBPE reports at ~20 % better bytes-per-token, transplanted from
 *   tokenizer design into a reversible pre-stage.
 *
 * CONSTRUCTION.
 *   1. Tokenize the source with o200k; keep unit types with count >= SYG_MIN_COUNT.
 *   2. Take the top K by count (K is swept; the best K wins).
 *   3. Assign each unit a distinct ONE-TOKEN glyph, chosen to maximise the
 *      weighted number of ADJACENT glyph pairs that are themselves a single
 *      token (the merge graph). Pure greedy assignment, then a swap hill-climb.
 *      Every merge question is decided by the authoritative `countTokens`, never
 *      assumed from string shape.
 *   4. Emit  contract + tape + SEP + body, the tape in the ordinary
 *      `new-letter starts a rule` form this stack already uses.
 *
 * WHY IT IS EXACT. Replacement happens at TOKEN boundaries, not by substring
 * search, so it is a bijection on the token sequence; the reader inverts it by
 * CHARACTER-level expansion, which needs no parsing and no assumption about how
 * the reader's own tokenizer cuts the line — a glyph that merges with its
 * neighbour is still just a character to expand. `sygkollesisEncode` decodes its
 * own message and throws on any mismatch, and the tape carries each value
 * verbatim as a safety net.
 * ----------------------------------------------------------------------------
 */

import { countTokens } from './bpe';
import { encode as o200kEncode, decode as o200kDecode } from 'gpt-tokenizer/encoding/o200k_base';

const SEP = '\u2016';            // ‖  separates tape from body
export const SYG_MIN_COUNT = 3;
export const SYG_MAX_K = 120;

/** Units of the source, in o200k token space. */
function tokenize(text: string): string[] {
  const ids = o200kEncode(text);
  return ids.map((i) => o200kDecode([i]));
}

/** Pool of characters that cost exactly one token each. */
function buildPool(limit: number): string[] {
  const pool: string[] = [];
  for (let cp = 0x4e00; cp < 0xa000 && pool.length < limit; cp++) {
    const c = String.fromCharCode(cp);
    if (countTokens(c, 'o200k_base') === 1) pool.push(c);
  }
  for (let cp = 0x0400; cp < 0x0500 && pool.length < limit; cp++) {
    const c = String.fromCharCode(cp);
    if (countTokens(c, 'o200k_base') === 1) pool.push(c);
  }
  return pool;
}

let POOL: string[] | null = null;
let MERGE = new Map<string, boolean>();

function pool(): string[] { if (POOL === null) POOL = buildPool(300); return POOL; }

/** Is `a+b` a single token? Probed with the real counter, cached. */
function merges(a: string, b: string): boolean {
  const k = a + b;
  let v = MERGE.get(k);
  if (v === undefined) { v = countTokens(k, 'o200k_base') === 1; MERGE.set(k, v); }
  return v;
}

/**
 * Assign glyphs to `units` given `adj[u][v]` = how often unit v immediately
 * follows unit u. Greedy in descending count, then a swap hill-climb.
 */
function assign(units: string[], adj: Map<string, Map<string, number>>, counts: Map<string, number>,
                poolChars: string[], restarts: number): { glyphOf: Map<string, string>; score: number } {
  const order = [...units].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  let best: Map<string, string> | null = null, bestScore = -1;
  for (let r = 0; r < restarts; r++) {
    const glyphOf = new Map<string, string>();
    const taken = new Set<string>();
    for (const u of order) {
      let bg = '', bs = -1;
      for (const g of poolChars) {
        if (taken.has(g)) continue;
        let s = 0;
        for (const [v, gv] of glyphOf) {
          const w = (adj.get(u)?.get(v) ?? 0) + (adj.get(v)?.get(u) ?? 0);
          if (w > 0 && (merges(g, gv) || merges(gv, g))) s += w;
        }
        if (s > bs) { bs = s; bg = g; }
      }
      if (!bg) break;
      glyphOf.set(u, bg); taken.add(bg);
    }
    if (glyphOf.size !== units.length) continue;
    // swap hill-climb
    let cur = scoreOf(glyphOf, adj);
    for (let pass = 0; pass < 6; pass++) {
      let improved = false;
      for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
          const a = units[i]!, b = units[j]!;
          const ga = glyphOf.get(a)!, gb = glyphOf.get(b)!;
          glyphOf.set(a, gb); glyphOf.set(b, ga);
          const s2 = scoreOf(glyphOf, adj);
          if (s2 > cur) { cur = s2; improved = true; } else { glyphOf.set(a, ga); glyphOf.set(b, gb); }
        }
      }
      if (!improved) break;
    }
    if (cur > bestScore) { bestScore = cur; best = new Map(glyphOf); }
  }
  return { glyphOf: best ?? new Map(), score: bestScore };
}

function scoreOf(glyphOf: Map<string, string>, adj: Map<string, Map<string, number>>): number {
  let s = 0;
  for (const [u, m] of adj) {
    const gu = glyphOf.get(u); if (!gu) continue;
    for (const [v, w] of m) {
      const gv = glyphOf.get(v); if (!gv) continue;
      if (merges(gu, gv)) s += w;
    }
  }
  return s;
}

export interface SygkollesisResult {
  message: string;
  decode: (m: string) => string;
  k: number;
  mergeScore: number;
  tokens: number;
  /** True when this arm is disabled by env (see sygkollesisDisabled). */
  disabled?: boolean;
}

/**
 * Encode `text`. Returns null when the construction does not pay; throws when it
 * cannot reproduce the source, which callers must surface as a hard failure.
 */
export function sygkollesisEncode(text: string, enc: 'o200k_base' = 'o200k_base'): SygkollesisResult | null {
  if (sygkollesisDisabled()) return null;
  if (text.length === 0 || text.includes(SEP)) return null;
  const toks = tokenize(text);
  if (toks.length < 40) return null;

  const counts = new Map<string, number>();
  for (const t of toks) counts.set(t, (counts.get(t) ?? 0) + 1);
  const cands = [...counts.entries()].filter(([, c]) => c >= SYG_MIN_COUNT)
    .sort((a, b) => b[1] - a[1]).slice(0, SYG_MAX_K).map(([u]) => u);
  if (cands.length < 4) return null;

  // adjacency among candidates
  const candSet = new Set(cands);
  const adj = new Map<string, Map<string, number>>();
  for (let i = 0; i + 1 < toks.length; i++) {
    const a = toks[i]!, b = toks[i + 1]!;
    if (!candSet.has(a) || !candSet.has(b)) continue;
    let m = adj.get(a); if (!m) { m = new Map(); adj.set(a, m); }
    m.set(b, (m.get(b) ?? 0) + 1);
  }

  const poolChars = pool();
  const baseTokens = countTokens(text, enc);
  let best: { message: string; k: number; mergeScore: number; tokens: number; glyphOf: Map<string, string> } | null = null;

  for (const K of [16, 24, 32, 48, 64, 96].filter((k) => k <= cands.length && k <= poolChars.length)) {
    const units = cands.slice(0, K);
    const { glyphOf, score } = assign(units, adj, counts, poolChars, 2);
    if (glyphOf.size !== K) continue;
    const tape = '\u00a7' + units.map((u) => glyphOf.get(u)! + u).join('');
    const body = toks.map((t) => glyphOf.get(t) ?? t).join('');
    // NOTE: the contract must not contain SEP — `decode` splits at SEP's first
    // occurrence, so an SEP in the contract would slice the message mid-rule.
    const contract = '\u00b6 each k stands for the v after it; expand every k; print only the result.\n';
    const message = contract + tape + SEP + body;
    const n = countTokens(message, enc);
    if (!best || n < best.tokens) best = { message, k: K, mergeScore: score, tokens: n, glyphOf };
  }
  if (!best || best.tokens >= baseTokens) return null;

  const glyphToValue = new Map<string, string>();
  for (const [u, g] of best.glyphOf) glyphToValue.set(g, u);

  // exact inverse, plus a self-check on this very message
  const decode = (m: string): string => {
    const i = m.indexOf(SEP);
    const bodyPart = i < 0 ? '' : m.slice(i + 1);
    let out = '';
    for (const ch of bodyPart) out += glyphToValue.get(ch) ?? ch;
    return out;
  };
  if (decode(best.message) !== text) throw new Error('\u03a3\u03a5\u0393\u039a\u038c\u039b\u039b\u0397\u03a3\u0399\u03a3 did not reconstruct the source');
  return { message: best.message, decode, k: best.k, mergeScore: best.mergeScore, tokens: best.tokens };
}

/**
 * Opt in with OMEGA_SYGKOLLESIS=1. Ships OFF by measurement, not by caution:
 * as a pre-stage it costs +2190 tokens over the 29 canonical lanes (0 better /
 * 26 worse, receipts under bench/x126/receipts/x129-*), and as a post-stage it
 * is exactly 0 on every lane because the stack's output leaves no repeated
 * one-token units to glyph. It is kept because the raw-level win is large
 * (-4235 over 23 lanes) and the mechanism is the only known way past the
 * one-token floor.
 */
export function sygkollesisDisabled(): boolean {
  if (typeof process === 'undefined') return true;
  return process.env?.OMEGA_SYGKOLLESIS !== '1'
    || process.env?.OMEGA_NO_SYGKOLLESIS === '1';
}

/** Drop the memo caches the probe built, between A/B arms. */
export function sygkollesisResetProbes(): void { MERGE = new Map(); POOL = null; }
