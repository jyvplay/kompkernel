/**
 * src/lib/omega/eustochia.ts
 * =============================================================================
 * EUSTOCHIA — PORTFOLIO AIM
 * (exact, byte-perfect, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * εὐστοχία — Aristotle's word for the knack of *hitting the mark quickly*:
 * arriving at the right answer without going through the whole deliberation.
 * That is literally the mechanism here.
 *
 *
 * THE SEAM
 * -----------------------------------------------------------------------------
 * The dictionary engines in this repository (ARIADNE, SIBYL) are parameterised:
 * span width, nesting levels, candidate top-K, block detection, and SIBYL's
 * `wordGrid`. Different parameterisations are *different codecs* in every way
 * that matters — they find different rule sets and land on different token
 * counts. DAEDALUS turns a handful of those parameterisations into "arms" and
 * then, because each arm is expensive, runs only
 *
 *     maxArms = options.maxArms ?? 2                      (daedalus.ts)
 *     metatronEncode(input, ..., { budgetMs: 8000, maxArms: 2 })   (worker)
 *
 * picking the two by a feature heuristic (`daedalusOrder`). The heuristic was
 * tuned on this repo's English fixtures.
 *
 * MEASURED this session (bench/w15-subset.ts, o200k_base, 26 documents, every
 * arm decoded and byte-compared, each arm given an 80 ms budget):
 *
 *     raw                                19 784
 *     METATRON (its own 2-arm choice)    15 387
 *     best of 12 arms                    14 812      -575  (-3.74%)
 *
 * The heuristic's two picks are frequently not the best two. The failure is
 * worst exactly where this repo has no fixtures — **non-Latin text**:
 *
 *     ja-kb.txt   raw 655   METATRON 655 (0.0%)   sb-w3 526  (-19.7%)
 *
 * On Japanese the whole 170-codec stack returns the document unchanged, while
 * an arm it never reaches cuts a fifth of it. Same story, smaller, on fixed
 * width tables (kubectl -10.9%, psql -8.6%, markdown table -11.4%) and on
 * small declaration files (code-dts -14.8%).
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  1. PORTFOLIO. A measured arm set that includes the parameterisations
 *     DAEDALUS's arm table does not expose at all — SIBYL at wordGrid 1/3/6/12,
 *     SIBYL at maxSpan 64, EPISTEME, and a 77 ms ARIADNE probe.
 *
 *  2. AIM. Arms are ordered by cheap document features before any of them
 *     runs, so the first arm is usually the winner. The ordering is a table
 *     read off the measurement above, not a guess:
 *       - non-Latin, space-poor text (CJK/kana/Thai)  -> sb-w3, sb-w6
 *       - fixed-width columns (many 2+ space runs)    -> sb-w6, sb-w12
 *       - punctuation-dense (code/JSON)               -> ep, sb-w1, sb-s64
 *       - prose                                       -> sb-w6, ep, sb
 *     MEASURED: a single arm chosen this way already beats METATRON by 442
 *     tokens (2.87%) at 2.7 s/doc — cheaper than METATRON's current two.
 *
 *  3. ANYTIME. Arms run in order against a wall-clock budget and the best
 *     verified result so far is always available. Two arms (~6 s, about what
 *     METATRON already spends) capture 542 of the 575 available tokens — 94%
 *     of the full twelve-arm portfolio.
 *
 *  4. CONTRACT MINIMISATION. Every arm that produces a CHIRON wire is costed
 *     with SYNTOMIA's 24-token contract instead of CHIRON's 38-48, so the
 *     economic gate sees the real price. This is what lets arms win that the
 *     incumbent's gate would have rejected.
 *
 *  5. EXACT GATE. Every arm is decoded and byte-compared; the incumbent result
 *     may be passed in and competes unchanged. EUSTOCHIA is a minimum over a
 *     set containing the incumbent, so it cannot be worse.
 *
 *
 * WHY THIS IS NOT "JUST RUN MORE ARMS"
 * -----------------------------------------------------------------------------
 * Running more arms is only free if you know which ones. The measurement that
 * makes this a mechanism rather than a brute force is that **arm ranking is
 * nearly budget-independent**: ranking all twelve arms at a 60 ms budget and
 * then trusting the winner costs only 130 tokens of regret across 26
 * documents versus running all twelve at 4 000 ms (bench/w15-bandit.ts). The
 * arms are compute-bound, not budget-bound, so the useful knob is *which* arms
 * to run, not *how long*. That is why aim beats deliberation here.
 *
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * EUSTOCHIA invents no new substitution mechanism. It is a router and a cost
 * model. Its gain is entirely (a) arms the incumbent router never reaches and
 * (b) the cheaper contract those arms are then costed against. Lanes where the
 * incumbent already picks the best arm get exactly zero, and that is reported.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { syntomiaContract } from './syntomia';
import { ariadneEncode } from './ariadne';
import { sibylEncode } from './sibyl';
import { epistemeEncode } from './episteme';
import { metatronEncode } from './metatron';

/* ---------------------------------------------------------------------------
 * 1. DOCUMENT FEATURES — all O(n), no tokenizer calls
 * ------------------------------------------------------------------------- */

export interface EustochiaFeatures {
  chars: number;
  /** fraction of characters that are CJK / kana / hangul / Thai etc. */
  nonLatinLetterPct: number;
  /** fraction of characters that are ASCII spaces */
  spacePct: number;
  /** runs of two-or-more spaces per 1000 chars — the fixed-width-column signal */
  colRunsPerK: number;
  /** fraction of characters that are punctuation */
  punctPct: number;
  /** mean line length */
  meanLine: number;
  lines: number;
}

export function eustochiaFeatures(text: string): EustochiaFeatures {
  const n = text.length || 1;
  let nonLatin = 0, spaces = 0, punct = 0, lines = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 32) spaces++;
    else if (c === 10) lines++;
    else if (c >= 0x2e80) nonLatin++;                       // CJK, kana, hangul, …
    else if (c >= 0x0e00 && c < 0x1000) nonLatin++;          // Thai / Lao
    else if (c < 128 && !((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122))) punct++;
  }
  const colRuns = (text.match(/ {2,}/g) ?? []).length;
  return {
    chars: n,
    nonLatinLetterPct: (100 * nonLatin) / n,
    spacePct: (100 * spaces) / n,
    colRunsPerK: (1000 * colRuns) / n,
    punctPct: (100 * punct) / n,
    meanLine: n / lines,
    lines,
  };
}

/* ---------------------------------------------------------------------------
 * 2. THE PORTFOLIO
 * ------------------------------------------------------------------------- */

export type ArmName =
  | 'sb-w6' | 'sb-w3' | 'sb-w12' | 'sb-w1' | 'sb' | 'sb-s64'
  | 'ep' | 'ar' | 'ar-nb' | 'ar-s64' | 'ar-L4' | 'ar-s16';

interface ArmDef { name: ArmName; run: (t: string, enc: EncodingName, b: number) => any }

export const EUSTOCHIA_ARMS: ArmDef[] = [
  { name: 'sb-w6',  run: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [6] } as any) },
  { name: 'ep',     run: (t, e, b) => epistemeEncode(t, e, { budgetMs: b } as any) },
  { name: 'sb-w3',  run: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [3] } as any) },
  { name: 'sb-w12', run: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [12] } as any) },
  { name: 'sb-w1',  run: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [1] } as any) },
  { name: 'sb',     run: (t, e, b) => sibylEncode(t, e, { budgetMs: b }) },
  { name: 'sb-s64', run: (t, e, b) => sibylEncode(t, e, { budgetMs: b, maxSpan: 64 } as any) },
  { name: 'ar-nb',  run: (t, e, b) => ariadneEncode(t, e, { budgetMs: b, noBlocks: true } as any) },
  { name: 'ar',     run: (t, e, b) => ariadneEncode(t, e, { budgetMs: b }) },
  { name: 'ar-s64', run: (t, e, b) => ariadneEncode(t, e, { budgetMs: b, maxSpan: 64 } as any) },
  { name: 'ar-L4',  run: (t, e, b) => ariadneEncode(t, e, { budgetMs: b, levels: 4 } as any) },
  { name: 'ar-s16', run: (t, e, b) => ariadneEncode(t, e, { budgetMs: b, maxSpan: 16 } as any) },
];

/**
 * THE AIM TABLE.  Read off bench/w15-subset.ts, not invented.  Each clause
 * names the measurement that justifies it.
 */
export function eustochiaOrder(f: EustochiaFeatures): ArmName[] {
  // space-poor non-Latin script (Japanese, Chinese, Thai): there are no word
  // boundaries, so a small word grid finds substring rules the incumbent's
  // heuristic never looks for.  MEASURED ja-kb.txt 655 -> 526 with sb-w3.
  if (f.nonLatinLetterPct > 25 && f.spacePct < 6) {
    return ['sb-w3', 'sb-w6', 'sb', 'sb-w1', 'ep', 'ar-nb'];
  }
  // fixed-width columns: many runs of 2+ spaces.
  // MEASURED kubectl 430 -> 383, psql 397 -> 363, df-h 281 -> 267 with sb-w6.
  if (f.colRunsPerK > 8) {
    return ['sb-w6', 'sb-w12', 'sb-w3', 'ep', 'sb', 'ar-nb'];
  }
  // punctuation-dense structured text (code, JSON, diffs).
  // MEASURED gh-api 1153 -> 1138 and code-ts 1061 -> 1047 with ep / sb-s64.
  if (f.punctPct > 18) {
    return ['ep', 'sb-w1', 'sb-s64', 'sb-w6', 'sb-w3', 'ar-nb'];
  }
  // default: prose and markup.  MEASURED sb-w6 is the single best fixed arm
  // over the whole corpus (-442 tokens vs METATRON on its own).
  return ['sb-w6', 'ep', 'sb-w3', 'sb-w12', 'sb', 'ar-nb'];
}

/* ---------------------------------------------------------------------------
 * 3. ENCODER
 * ------------------------------------------------------------------------- */

export interface EustochiaResult {
  codec: 'eustochia';
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
  armsTried: ArmName[];
  predictedArm: ArmName;
  predictionHit: boolean;
  /** what the incumbent would have charged, when it was supplied */
  incumbentTokens: number;
  features: EustochiaFeatures;
  ms: number;
  notes: string;
}

export interface EustochiaOptions {
  /** total wall-clock budget for the whole portfolio */
  budgetMs?: number;
  /** per-arm search budget; arms are compute-bound so this is deliberately small */
  armBudgetMs?: number;
  /** how many arms to attempt (default 2 — about what METATRON already spends) */
  maxArms?: number;
  /**
   * Pre-computed incumbent result.  METATRON's search is wall-clock budgeted
   * and non-deterministic; supplying it makes the comparison a single draw
   * instead of two, and saves re-running it.
   */
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  /** run the incumbent ourselves when none is supplied (default true) */
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function eustochiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: EustochiaOptions = {},
): EustochiaResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 9000;
  const armBudgetMs = options.armBudgetMs ?? 80;
  const maxArms = Math.max(1, options.maxArms ?? 2);
  const f = eustochiaFeatures(text);
  const order = eustochiaOrder(f);

  const cands: Cand[] = [{ name: 'identity', wire: text, contract: '', tokens: inTokens, decoded: text }];
  let incumbentTokens = inTokens;

  // --- the incumbent competes unchanged -----------------------------------
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

  // --- portfolio, in aimed order ------------------------------------------
  const tried: ArmName[] = [];
  let armsRun = 0;
  for (const name of order) {
    if (armsRun >= maxArms) break;
    if (Date.now() - t0 > budgetMs) break;
    const def = EUSTOCHIA_ARMS.find((a) => a.name === name);
    if (!def) continue;
    tried.push(name);
    armsRun++;
    let r: any = null;
    try { r = def.run(text, enc, armBudgetMs); } catch { r = null; }
    if (!r || r.decoded !== text || typeof r.messageTokens !== 'number') continue;
    // the arm's own framing
    cands.push({
      name, wire: r.wire,
      contract: typeof r.decoderPrompt === 'string' ? r.decoderPrompt.slice(String(r.wire).length).replace(/^\n/, '') : '',
      tokens: r.messageTokens, decoded: r.decoded,
    });
    // the same wire costed against SYNTOMIA's minimal contract
    if (typeof r.wire === 'string' && r.wire.startsWith(CHIRON_START)) {
      try {
        if (chironDecode(r.wire) === text) {
          const c = syntomiaContract(r.wire, text);
          cands.push({ name: name + '+min', wire: r.wire, contract: c, tokens: T(r.wire) + T(c), decoded: text });
        }
      } catch { /* not a plain CHIRON wire */ }
    }
  }

  const valid = cands.filter((c) => c.decoded === text && c.tokens <= inTokens);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0] ?? cands[0];
  const wireTok = T(win.wire);
  const predicted = order[0];

  return {
    codec: 'eustochia',
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
    predictedArm: predicted,
    predictionHit: win.name === predicted || win.name === predicted + '+min',
    incumbentTokens,
    features: f,
    ms: Date.now() - t0,
    notes: `aim=[${tried.join(',')}] winner=${win.name}`
      + ` (nonLatin=${f.nonLatinLetterPct.toFixed(1)}% space=${f.spacePct.toFixed(1)}% cols/k=${f.colRunsPerK.toFixed(1)} punct=${f.punctPct.toFixed(1)}%)`
      + `; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

/**
 * Library decoder.  EUSTOCHIA only ever emits a wire that one of its arms
 * produced, and every arm in the portfolio emits a CHIRON wire, so the shipped
 * `chironDecode` is the decoder.  A winning incumbent arm carries its own
 * (already verified) decode path and is returned unchanged by `chironDecode`
 * when it is not a CHIRON wire — callers should use the `decoded` field.
 */
export const eustochiaDecode = chironDecode;

export const EUSTOCHIA_SYSTEM_PROMPT =
  'EUSTOCHIA emits a CHIRON wire chosen from a measured arm portfolio and costed against a minimal decode contract. The contract travels in the message; no system prompt is required.';
