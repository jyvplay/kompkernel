/**
 * src/lib/omega/logistike.ts
 * =============================================================================
 * LOGISTIKE — THE RECKONING
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * λογιστική — in Greek mathematics, the *art of practical reckoning*: actually
 * computing the bill, as opposed to ἀριθμητική, the theory of number. This
 * lane is named for the distinction because that is exactly what it supplies:
 * the stack has a beautiful theory of which rules are good and no cheap way to
 * compute the bill, so it estimates. LOGISTIKE makes the bill computable.
 *
 *
 * THE THEOREM THIS LANE RESTS ON
 * -----------------------------------------------------------------------------
 * tiktoken-family encoders apply a regex pre-tokenizer BEFORE any BPE merge,
 * and merges never cross a chunk produced by that regex. Therefore
 *
 *      |encode(s)|  =  Σ over pre-tokenizer chunks c of s  of  |encode(c)|
 *
 * — token count is ADDITIVE over chunks, exactly, not approximately.
 *
 * This repository already names the idea ("chunk-boundary invariance theorem"
 * in bpe.ts) for the narrow case of `" "+[A-Za-z]+` atoms. What had never been
 * done is to *verify it in general and then use it as a cost algebra*.
 *
 * MEASURED (bench/w17-regex.ts, 43 documents spanning English, German,
 * Spanish, Turkish, Russian, Polish, Japanese, HTML, XML, SVG, JSX, LaTeX,
 * SQL, CSV, logs, markdown and code):
 *
 *     o200k_base  + o200k pattern   -> EXACT on 43/43
 *     cl100k_base + cl100k pattern  -> EXACT on 43/43
 *     o200k_base  + cl100k pattern  -> exact on 40/43   (the near-miss that
 *                                      made the previous lane, AKRIBEIA, ship
 *                                      this model as "ranking only")
 *
 * The two encodings need *different* patterns. o200k splits a word into an
 * upper-case run and a lower-case run and attaches `'s`-style contractions to
 * the word; cl100k does not. Using one pattern for both is what produced the
 * 3 divergences AKRIBEIA had to defend against. With the right pattern per
 * encoding the model is exact, and the caveat disappears.
 *
 * Two consequences, both measured:
 *
 *  (1) MEMOISED COUNTING. Chunks repeat 1.4x-5.5x inside one document and
 *      almost totally across documents (the chunk " the" is the same chunk
 *      everywhere). A per-chunk cache therefore amortises the BPE work across
 *      an entire session. MEASURED 1.8x-2.2x on whole-document counts
 *      (bench/w17-speed.ts) — and because the cache is global and persistent,
 *      the second arm, the third arm and the next document are cheaper still.
 *
 *  (2) WINDOWED DELTAS. The token delta of replacing a substring is confined
 *      to the chunks the replacement touches, so a candidate can be scored by
 *      re-tokenising only +/-96 characters around each occurrence.
 *      MEASURED (bench/w17-win.ts, 2 543 real candidates over 5 documents):
 *      **3.3x faster and exact on 99.76%** of them. The 0.24% are candidates
 *      longer than the window; LOGISTIKE therefore uses windowed deltas for
 *      RANKING and a real whole-string `countTokens` for every accept.
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  1. EXACT RECKONING. `logistikeTokens` — chunk-additive, memoised, per-
 *     encoding pattern. Verified equal to `countTokens` on 43/43 documents and
 *     on every red-team input; a `logistikeVerify` gate is exported so callers
 *     can assert it rather than trust it.
 *  2. A WIDER PORTFOLIO FOR THE SAME MONEY. Because counting is ~2x cheaper
 *     and the cache is shared across arms, LOGISTIKE runs SIX aimed arms in
 *     about the wall-clock AKRIBEIA spends on three. Measured over 12 arms,
 *     the extra arms are worth real tokens (bench/w15-subset.ts).
 *  3. AIM. Arms are ordered by four O(n) features before anything runs, each
 *     clause carrying its justifying measurement.
 *  4. MINIMAL CONTRACT. Every CHIRON wire is costed with SYNTOMIA's 24-token
 *     contract rather than CHIRON's 38-48.
 *  5. EXACT DROP-POLISH, inherited from AKRIBEIA.
 *  6. ANYTIME + EXACT GATE. A hard wall-clock budget; the best byte-verified
 *     candidate so far is always available; the incumbent competes unchanged,
 *     so LOGISTIKE is a minimum over a set containing it and cannot be worse.
 *
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No new substitution mechanism. Three were built and measured this session
 * and all three failed: an ADD-polish offering the arms the long repeats their
 * `maxSpan = 24` symbol cap cannot propose (**0 rules added across 42
 * documents** — the hierarchical levels already reach them); a whole-document
 * fast counter as a speed story (only 1.8x); and portfolio fusion in the
 * previous turn (0 tokens). They are recorded in bench/logistike-report.md §D.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { syntomiaContract } from './syntomia';
import { akribeiaPolish } from './akribeia';
import { ariadneEncode } from './ariadne';
import { sibylEncode } from './sibyl';
import { epistemeEncode } from './episteme';
import { metatronEncode } from './metatron';

/* ---------------------------------------------------------------------------
 * 1. THE COST ALGEBRA
 * ------------------------------------------------------------------------- */

/**
 * The real o200k_base pre-tokenizer.  Note the two word alternatives (an
 * upper-case run followed by a lower-case run, and the reverse) and the
 * contraction suffix — this is what cl100k's pattern lacks and why using one
 * pattern for both encodings loses exactness.
 */
export const PRETOKEN_O200K =
  /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

/** The real cl100k_base pre-tokenizer. */
export const PRETOKEN_CL100K =
  /'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

export function pretokenPattern(enc: EncodingName): RegExp {
  return enc === 'cl100k_base' ? PRETOKEN_CL100K : PRETOKEN_O200K;
}

export function pretokenChunks(s: string, enc: EncodingName): string[] | null {
  const re = pretokenPattern(enc);
  re.lastIndex = 0;
  const cs = s.match(re);
  if (!cs) return s.length === 0 ? [] : null;
  // a partition that does not reconstruct the input is not a partition
  let n = 0;
  for (const c of cs) n += c.length;
  if (n !== s.length) return null;
  return cs;
}

/** global, persistent, session-wide chunk cache: " the" is the same chunk in every document */
const CHUNK = new Map<string, number>();
let hits = 0, misses = 0;

export function logistikeCacheStats() { return { size: CHUNK.size, hits, misses }; }
export function logistikeCacheClear() { CHUNK.clear(); hits = 0; misses = 0; }

/**
 * Exact token count by chunk-additive reckoning.  Falls back to the real
 * tokenizer whenever the partition does not reconstruct the input, so it is
 * never a source of error — only of speed.
 */
export function logistikeTokens(s: string, enc: EncodingName = 'o200k_base'): number {
  if (s === '') return 0;
  const cs = pretokenChunks(s, enc);
  if (cs === null) return countTokens(s, enc);
  let n = 0;
  for (const c of cs) {
    const k = enc === 'cl100k_base' ? '\u0002' + c : c;
    const v = CHUNK.get(k);
    if (v === undefined) {
      misses++;
      const t = countTokens(c, enc);
      if (CHUNK.size > 400000) { CHUNK.clear(); }
      CHUNK.set(k, t);
      n += t;
    } else { hits++; n += v; }
  }
  return n;
}

/** Assert the algebra rather than trust it.  Used by the red team and by callers. */
export function logistikeVerify(s: string, enc: EncodingName = 'o200k_base'): boolean {
  return logistikeTokens(s, enc) === countTokens(s, enc);
}

/**
 * Exact-by-construction delta of replacing every occurrence of `needle` with
 * `glyph`, computed only in +/-`win` character windows.
 * MEASURED exact on 99.76% of 2 543 real candidates; RANKING ONLY — every
 * acceptance in this module goes through `countTokens` on the full string.
 */
export function logistikeWindowDelta(
  body: string, needle: string, glyph: string, enc: EncodingName = 'o200k_base', win = 96,
): { delta: number; occurrences: number } {
  if (!needle) return { delta: 0, occurrences: 0 };
  let delta = 0, occurrences = 0, i = 0;
  for (;;) {
    const j = body.indexOf(needle, i);
    if (j < 0) break;
    occurrences++;
    const lo = Math.max(0, j - win);
    const hi = Math.min(body.length, j + needle.length + win);
    const pre = body.slice(lo, j), post = body.slice(j + needle.length, hi);
    delta += logistikeTokens(pre + needle + post, enc) - logistikeTokens(pre + glyph + post, enc);
    i = j + needle.length;
  }
  return { delta, occurrences };
}

/* ---------------------------------------------------------------------------
 * 2. AIM
 * ------------------------------------------------------------------------- */

export interface LogistikeFeatures {
  chars: number; nonLatinPct: number; spacePct: number; colRunsPerK: number; punctPct: number;
}

export function logistikeFeatures(text: string): LogistikeFeatures {
  const n = text.length || 1;
  let nonLatin = 0, spaces = 0, punct = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 32) spaces++;
    else if (c >= 0x2e80) nonLatin++;
    else if (c >= 0x0e00 && c < 0x1000) nonLatin++;
    else if (c < 128 && !((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122))) punct++;
  }
  const colRuns = (text.match(/ {2,}/g) ?? []).length;
  return {
    chars: n,
    nonLatinPct: (100 * nonLatin) / n,
    spacePct: (100 * spaces) / n,
    colRunsPerK: (1000 * colRuns) / n,
    punctPct: (100 * punct) / n,
  };
}

export type LogArm = 'w1' | 'w3' | 'w6' | 'w12' | 'w24' | 'sb' | 'ep' | 'ar';

const ARM: Record<LogArm, (t: string, e: EncodingName, b: number) => any> = {
  w1:  (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [1] } as any),
  w3:  (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [3] } as any),
  w6:  (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [6] } as any),
  w12: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [12] } as any),
  w24: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [24] } as any),
  sb:  (t, e, b) => sibylEncode(t, e, { budgetMs: b }),
  ep:  (t, e, b) => epistemeEncode(t, e, { budgetMs: b } as any),
  ar:  (t, e, b) => ariadneEncode(t, e, { budgetMs: b, noBlocks: true } as any),
};

/** Arm order; every clause carries the measurement that justifies it. */
export function logistikeOrder(f: LogistikeFeatures): LogArm[] {
  // space-poor non-Latin (Japanese, Chinese, Thai): no word boundaries.
  // MEASURED ja-kb 655 -> 515 where the whole stack returns 655.
  if (f.nonLatinPct > 25 && f.spacePct < 6) return ['w3', 'w6', 'w1', 'sb', 'ep', 'ar'];
  // fixed-width columns. MEASURED kubectl 430 -> 383, psql 397 -> 363.
  if (f.colRunsPerK > 8) return ['w6', 'w12', 'w3', 'ep', 'w24', 'ar'];
  // punctuation-dense markup / code / JSON. MEASURED pom.xml 283 -> 262,
  // chart.svg 465 -> 431, component.jsx 296 -> 278.
  if (f.punctPct > 18) return ['ep', 'w1', 'w6', 'w12', 'w3', 'ar'];
  // prose and markdown: w6 is the best single fixed arm over the corpus.
  return ['w6', 'ep', 'w3', 'w12', 'sb', 'ar'];
}

/* ---------------------------------------------------------------------------
 * 3. ENCODER
 * ------------------------------------------------------------------------- */

export interface LogistikeResult {
  codec: 'logistike';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: string;
  armsRun: number;
  armsTried: LogArm[];
  rulesDropped: number;
  algebraExact: boolean;
  cache: { size: number; hits: number; misses: number };
  incumbentTokens: number;
  features: LogistikeFeatures;
  ms: number;
  notes: string;
}

export interface LogistikeOptions {
  budgetMs?: number;
  armBudgetMs?: number;
  maxArms?: number;
  polish?: boolean;
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function logistikeEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: LogistikeOptions = {},
): LogistikeResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 20000;
  const armBudgetMs = options.armBudgetMs ?? 80;
  const maxArms = Math.max(1, options.maxArms ?? 6);
  const doPolish = options.polish !== false;
  const f = logistikeFeatures(text);
  const order = logistikeOrder(f);
  const deadline = t0 + budgetMs;

  // warm the cost algebra on this document; cheap and makes every later
  // count on a derived string hit the cache
  const algebraExact = (() => { try { return logistikeVerify(text, enc); } catch { return false; } })();

  const cands: Cand[] = [{ name: 'identity', wire: text, contract: '', tokens: inTokens, decoded: text }];
  let incumbentTokens = inTokens;

  if (options.useIncumbent !== false) {
    try {
      const m = options.incumbent ?? metatronEncode(text, enc, { budgetMs: Math.min(4000, budgetMs) });
      if (m.decoded === text) {
        incumbentTokens = m.messageTokens;
        cands.push({
          name: 'metatron', wire: m.wire,
          contract: m.decoderPrompt.slice(m.wire.length).replace(/^\n/, ''),
          tokens: m.messageTokens, decoded: m.decoded,
        });
      }
    } catch { /* incumbent unavailable */ }
  }

  const tried: LogArm[] = [];
  let armsRun = 0;
  for (const name of order) {
    if (armsRun >= maxArms || Date.now() > deadline) break;
    tried.push(name);
    armsRun++;
    let r: any = null;
    try { r = ARM[name](text, enc, armBudgetMs); } catch { r = null; }
    if (!r || r.decoded !== text) continue;
    if (typeof r.messageTokens === 'number' && typeof r.wire === 'string') {
      cands.push({
        name, wire: r.wire,
        contract: typeof r.decoderPrompt === 'string' ? r.decoderPrompt.slice(r.wire.length).replace(/^\n/, '') : '',
        tokens: r.messageTokens, decoded: r.decoded,
      });
    }
    if (typeof r.wire === 'string' && r.wire.startsWith(CHIRON_START)) {
      try {
        if (chironDecode(r.wire) === text) {
          const c = syntomiaContract(r.wire, text);
          cands.push({ name: name + '+min', wire: r.wire, contract: c, tokens: T(r.wire) + T(c), decoded: text });
        }
      } catch { /* not a plain CHIRON wire */ }
    }
  }

  let rulesDropped = 0;
  if (doPolish) {
    const best = cands
      .filter((c) => c.wire !== text && c.wire.startsWith(CHIRON_START))
      .sort((a, b) => a.tokens - b.tokens)
      .slice(0, 2);
    for (const c of best) {
      if (Date.now() > deadline) break;
      try {
        const p = akribeiaPolish(c.wire, text, enc, 200, deadline);
        if (p && p.tokens < c.tokens) {
          cands.push({
            name: c.name + '+polish', wire: p.wire,
            contract: syntomiaContract(p.wire, text), tokens: p.tokens, decoded: text,
          });
          rulesDropped += p.dropped;
        }
      } catch { /* polish unavailable */ }
    }
  }

  const valid = cands.filter((c) => c.decoded === text && c.tokens <= inTokens);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0] ?? cands[0];
  const wireTok = T(win.wire);

  return {
    codec: 'logistike',
    wire: win.wire,
    decoded: win.decoded,
    exact: true,
    inTokens,
    outTokens: wireTok,
    messageTokens: win.tokens,
    contractTokens: win.tokens - wireTok,
    decoderPrompt: win.contract ? win.wire + '\n' + win.contract : win.wire,
    savingsPct: inTokens ? ((inTokens - win.tokens) / inTokens) * 100 : 0,
    winner: win.name,
    armsRun,
    armsTried: tried,
    rulesDropped,
    algebraExact,
    cache: logistikeCacheStats(),
    incumbentTokens,
    features: f,
    ms: Date.now() - t0,
    notes: `aim=[${tried.join(',')}] winner=${win.name} dropped=${rulesDropped} algebra=${algebraExact ? 'exact' : 'fallback'}`
      + `; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

/** LOGISTIKE only ever emits CHIRON wires (or the incumbent's own, already verified). */
export const logistikeDecode = chironDecode;

export const LOGISTIKE_SYSTEM_PROMPT =
  'LOGISTIKE emits a CHIRON wire chosen by exact chunk-additive token reckoning and costed against a minimal decode contract. The contract travels in the message; no system prompt is required.';
