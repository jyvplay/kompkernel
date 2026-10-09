/**
 * src/lib/omega/akribeia.ts
 * =============================================================================
 * AKRIBEIA — EXACTNESS
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * ἀκρίβεια — exactness; the virtue of measuring precisely rather than
 * estimating well. That is the entire mechanism.
 *
 *
 * THE SEAM
 * -----------------------------------------------------------------------------
 * Every dictionary engine in this repository optimises against an ESTIMATE and
 * only measures exactly at the very end. ARIADNE says so in its own notes:
 *
 *     "...symbol-space DP; 9 macros, 0 blocks, 0 lists; script=cyrillic;
 *      est=462 exact=458; assignment -0, local search -0..."
 *
 * An estimate is used because exact measurement means calling the tokenizer on
 * the whole document once per candidate, and there are thousands of candidates.
 * Three measured consequences:
 *
 *  (1) SIBYL's `wordGrid` is an internal sweep and it picks the winning grid
 *      point by estimate. MEASURED (bench/w16-grid.ts, 26 docs): one call with
 *      `wordGrid:[0,1,2,3,4,6,8,12,16,24,32,48]` costs 119 s and lands on
 *      15 088 tokens; running only four of those grid points as separate calls
 *      and taking the EXACT minimum costs 272 s and lands on **14 855** — the
 *      wide internal sweep is 2.28× faster and **233 tokens worse**. The
 *      machinery is there; the selection rule throws the win away.
 *
 *  (2) DAEDALUS caps the portfolio at two arms (`maxArms ?? 2`). Measured over
 *      12 arms with exact selection, its two picks leave 575 tokens (3.74%).
 *
 *  (3) Rules survive into the final wire whose EXACT marginal contribution is
 *      negative. Small, but non-zero and free to recover.
 *
 *
 * THE PRIMITIVE THAT MAKES EXACTNESS AFFORDABLE
 * -----------------------------------------------------------------------------
 * tiktoken-family encoders apply a regex pre-tokenizer before any BPE merge,
 * and **merges never cross a chunk boundary**. So token count is ADDITIVE over
 * pre-tokenizer chunks, and the token delta of a substring replacement is
 * confined to the chunks the replacement touches.
 *
 * MEASURED (bench/w16-local.ts):
 *   - chunk decomposition reproduces `countTokens` exactly on 33 of 36
 *     documents (3 divergences, all +1..+3, from edge cases in the
 *     contraction / trailing-whitespace clauses of the regex);
 *   - a WINDOWED delta — re-tokenising only ±80 characters around each
 *     occurrence — agreed with the true whole-document delta on **7 of 7**
 *     probes, including ` the` (58 occurrences, true delta −4).
 *
 * Because of the 3 divergences this module uses the chunk model **only for
 * ranking**, never for an accept/reject decision. Every acceptance in
 * AKRIBEIA is a real `countTokens` call on the real string. That is stated
 * rather than glossed: an approximate accelerator guarded by an exact gate.
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  1. EXACT GRID SELECTION. SIBYL's word grid is swept EXTERNALLY, one grid
 *     point per call, and the winner is chosen by real token count — not by
 *     SIBYL's internal estimate. This is where most of the gain is.
 *  2. AIM. The grid points and engines are ordered by cheap O(n) document
 *     features before anything runs (inherited from EUSTOCHIA, re-measured).
 *  3. MINIMAL CONTRACT. Every CHIRON wire is also costed with SYNTOMIA's
 *     24-token contract instead of CHIRON's 38-48, so the economic gate sees
 *     the real price.
 *  4. EXACT DROP-POLISH. Every rule in the winning tape is tested by actually
 *     removing it (inlining its text through the tape and the body) and
 *     re-measuring. Rules that do not pay are deleted. Chunk-locality makes
 *     this cost 0-170 ms.
 *  5. EXACT GATE. Every candidate is decoded with the shipped `chironDecode`
 *     and byte-compared; the incumbent competes unchanged. AKRIBEIA is a
 *     minimum over a set containing the incumbent, so it cannot be worse.
 *
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * AKRIBEIA invents no new substitution mechanism and no new wire grammar. It
 * emits CHIRON wires. Its gain is entirely from measuring exactly what the
 * incumbent estimates. Three other mechanisms were built and measured this
 * session and all three lost — portfolio FUSION (0 tokens), a wide internal
 * grid (-233), and a naive pooled greedy (catastrophic). They are recorded in
 * bench/akribeia-report.md §D rather than deleted.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS,
  chironDecode, chironParseTape, chironInScript,
} from './chiron';
import { syntomiaContract } from './syntomia';
import { ariadneEncode } from './ariadne';
import { sibylEncode } from './sibyl';
import { epistemeEncode } from './episteme';
import { metatronEncode } from './metatron';

/* ---------------------------------------------------------------------------
 * 0. CHUNK-LOCAL TOKEN MODEL  (ranking only — never an accept/reject)
 * ------------------------------------------------------------------------- */

/** the o200k_base / cl100k_base pre-tokenizer */
export const PRETOKEN_RE =
  /'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

export function pretokenChunks(s: string): string[] {
  return s.match(PRETOKEN_RE) ?? [];
}

const chunkTok = new Map<string, number>();

/**
 * Additive chunk model.  MEASURED exact on 33/36 documents; the 3 divergences
 * are +1..+3 tokens.  Used for RANKING only.
 */
export function akribeiaEstimate(s: string, enc: EncodingName): number {
  let n = 0;
  for (const c of pretokenChunks(s)) {
    const k = enc + '\u0001' + c;
    let v = chunkTok.get(k);
    if (v === undefined) { v = countTokens(c, enc); if (chunkTok.size > 300000) chunkTok.clear(); chunkTok.set(k, v); }
    n += v;
  }
  return n;
}

/** Is the chunk model exact on this document?  Cheap, and worth knowing. */
export function chunkModelExact(s: string, enc: EncodingName): boolean {
  return pretokenChunks(s).join('') === s && akribeiaEstimate(s, enc) === countTokens(s, enc);
}

/* ---------------------------------------------------------------------------
 * 1. TAPE SURGERY
 * ------------------------------------------------------------------------- */

export function scriptOfChar(ch: string) {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}

export interface TapeRule { g: string; raw: string }
export interface ParsedWire { rules: TapeRule[]; body: string }

export function parseWire(wire: string): ParsedWire | null {
  if (!wire.startsWith(CHIRON_START)) return null;
  const k = wire.indexOf(CHIRON_SEP);
  if (k < 0) return null;
  const tape = wire.slice(1, k);
  const body = wire.slice(k + 1);
  if (!tape.length) return null;
  const sc = scriptOfChar(tape[0]);
  if (!sc) return null;
  const rs = chironParseTape(tape, sc);
  if (!rs) return null;
  return { rules: rs.map((r) => ({ g: r.glyph, raw: r.raw })), body };
}

export function renderWire(rules: TapeRule[], body: string): string {
  return CHIRON_START + rules.map((r) => r.g + r.raw).join('') + CHIRON_SEP + body;
}

/** remove rule i by inlining its text everywhere it is referenced */
export function dropRule(p: ParsedWire, i: number): ParsedWire {
  const r = p.rules[i];
  return {
    rules: p.rules.filter((_, j) => j !== i).map((x) => ({ g: x.g, raw: x.raw.split(r.g).join(r.raw) })),
    body: p.body.split(r.g).join(r.raw),
  };
}

/* ---------------------------------------------------------------------------
 * 2. EXACT DROP-POLISH
 * ------------------------------------------------------------------------- */

export interface PolishResult { wire: string; tokens: number; dropped: number }

/**
 * Remove every rule whose EXACT marginal contribution is non-positive.
 * Greedy steepest-descent; each step is a real `countTokens` on a real wire
 * that is then decoded and byte-compared.  Never returns something worse.
 */
export function akribeiaPolish(
  wire: string, src: string, enc: EncodingName, maxIters = 200, deadline = Infinity,
): PolishResult | null {
  let p = parseWire(wire);
  if (!p) return null;
  const T = (s: string) => countTokens(s, enc);
  const costOf = (q: ParsedWire): number => {
    const w = renderWire(q.rules, q.body);
    if (chironDecode(w) !== src) return Number.POSITIVE_INFINITY;
    return T(w) + T(syntomiaContract(w, src));
  };
  let cur = costOf(p);
  if (!Number.isFinite(cur)) return null;
  let dropped = 0;
  for (let it = 0; it < maxIters; it++) {
    if (Date.now() > deadline) break;
    let bestI = -1, bestTok = cur, bestState: ParsedWire | null = null;
    for (let i = 0; i < p.rules.length; i++) {
      const d = dropRule(p, i);
      const c = costOf(d);
      if (c < bestTok) { bestTok = c; bestI = i; bestState = d; }
    }
    if (bestI < 0 || !bestState) break;
    p = bestState; cur = bestTok; dropped++;
  }
  const w = renderWire(p.rules, p.body);
  if (chironDecode(w) !== src) return null;
  return { wire: w, tokens: cur, dropped };
}

/* ---------------------------------------------------------------------------
 * 3. AIMED PORTFOLIO WITH EXACT GRID SELECTION
 * ------------------------------------------------------------------------- */

export interface AkribeiaFeatures {
  chars: number; nonLatinPct: number; spacePct: number; colRunsPerK: number; punctPct: number;
}

export function akribeiaFeatures(text: string): AkribeiaFeatures {
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

export type AkribeiaArm = 'w1' | 'w3' | 'w6' | 'w12' | 'w24' | 'sb' | 'ep' | 'ar';

const ARM_RUN: Record<AkribeiaArm, (t: string, e: EncodingName, b: number) => any> = {
  w1:  (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [1] } as any),
  w3:  (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [3] } as any),
  w6:  (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [6] } as any),
  w12: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [12] } as any),
  w24: (t, e, b) => sibylEncode(t, e, { budgetMs: b, wordGrid: [24] } as any),
  sb:  (t, e, b) => sibylEncode(t, e, { budgetMs: b }),
  ep:  (t, e, b) => epistemeEncode(t, e, { budgetMs: b } as any),
  ar:  (t, e, b) => ariadneEncode(t, e, { budgetMs: b, noBlocks: true } as any),
};

/**
 * Arm order.  Each clause carries the measurement that justifies it
 * (bench/w15-subset.ts, bench/w16-polish.ts, bench/w16-mk.ts).
 */
export function akribeiaOrder(f: AkribeiaFeatures): AkribeiaArm[] {
  // space-poor non-Latin (Japanese, Chinese, Thai): no word boundaries, so a
  // small word grid finds substring rules. MEASURED ja-kb 655 -> 526.
  if (f.nonLatinPct > 25 && f.spacePct < 6) return ['w3', 'w6', 'w1', 'sb', 'ep', 'ar'];
  // fixed-width columns. MEASURED kubectl 430 -> 393, psql 397 -> 363.
  if (f.colRunsPerK > 8) return ['w6', 'w12', 'w3', 'ep', 'w24', 'ar'];
  // punctuation-dense markup/code/JSON. MEASURED pom.xml 283 -> 264,
  // chart.svg 465 -> 432, component.jsx 296 -> 278.
  if (f.punctPct > 18) return ['ep', 'w1', 'w6', 'w3', 'sb', 'ar'];
  // prose and markdown. MEASURED w6 is the best single fixed arm overall.
  return ['w6', 'ep', 'w3', 'w12', 'sb', 'ar'];
}

/* ---------------------------------------------------------------------------
 * 4. ENCODER
 * ------------------------------------------------------------------------- */

export interface AkribeiaResult {
  codec: 'akribeia';
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
  armsTried: AkribeiaArm[];
  rulesDropped: number;
  chunkModelExact: boolean;
  incumbentTokens: number;
  features: AkribeiaFeatures;
  ms: number;
  notes: string;
}

export interface AkribeiaOptions {
  budgetMs?: number;
  armBudgetMs?: number;
  maxArms?: number;
  polish?: boolean;
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function akribeiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: AkribeiaOptions = {},
): AkribeiaResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 12000;
  const armBudgetMs = options.armBudgetMs ?? 80;
  const maxArms = Math.max(1, options.maxArms ?? 3);
  const doPolish = options.polish !== false;
  const f = akribeiaFeatures(text);
  const order = akribeiaOrder(f);
  const deadline = t0 + budgetMs;

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

  // --- portfolio with EXACT selection -------------------------------------
  const tried: AkribeiaArm[] = [];
  let armsRun = 0;
  for (const name of order) {
    if (armsRun >= maxArms || Date.now() > deadline) break;
    tried.push(name);
    armsRun++;
    let r: any = null;
    try { r = ARM_RUN[name](text, enc, armBudgetMs); } catch { r = null; }
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

  // --- exact drop-polish on the best CHIRON candidate ---------------------
  let rulesDropped = 0;
  if (doPolish) {
    const chironCands = cands
      .filter((c) => c.wire !== text && c.wire.startsWith(CHIRON_START))
      .sort((a, b) => a.tokens - b.tokens)
      .slice(0, 2);
    for (const c of chironCands) {
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
    codec: 'akribeia',
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
    chunkModelExact: (() => { try { return chunkModelExact(text, enc); } catch { return false; } })(),
    incumbentTokens,
    features: f,
    ms: Date.now() - t0,
    notes: `aim=[${tried.join(',')}] winner=${win.name} dropped=${rulesDropped}`
      + ` (nonLatin=${f.nonLatinPct.toFixed(1)}% space=${f.spacePct.toFixed(1)}% cols/k=${f.colRunsPerK.toFixed(1)} punct=${f.punctPct.toFixed(1)}%)`
      + `; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

/** AKRIBEIA only ever emits CHIRON wires (or the incumbent's own, already verified). */
export const akribeiaDecode = chironDecode;

export const AKRIBEIA_SYSTEM_PROMPT =
  'AKRIBEIA emits a CHIRON wire selected by exact token measurement and costed against a minimal decode contract. The contract travels in the message; no system prompt is required.';
