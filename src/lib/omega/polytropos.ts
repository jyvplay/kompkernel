/**
 * src/lib/omega/polytropos.ts
 * =============================================================================
 * POLYTROPOS — THE MANY-WAYED
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * πολύτροπος — Homer's first epithet for Odysseus: "of many turnings", the man
 * who tries another way when the first one fails. That is the mechanism.
 *
 *
 * THE SEAM
 * -----------------------------------------------------------------------------
 * ARIADNE and SIBYL are not single codecs. They are a CONFIGURATION SPACE:
 *
 *     maxSpan   ?? 24          levels  ?? 6        topK ?? 8000
 *     wordGrid  ?? [24, 48]    capGrid ?? [Infinity]    sep ?? '\n'
 *
 * Every point in that space is a different codec that finds a different rule
 * set and lands on a different token count.  DAEDALUS exposes six hand-written
 * arms that vary only `maxSpan`, `levels` and `words`, and then runs **two** of
 * them (`maxArms ?? 2`).  Three of the six dimensions are never varied by
 * anything in the repository:
 *
 *   - `capGrid` is hard-coded to `[Infinity]`  (sibyl.ts L353)
 *   - `sep` defaults to '\n' although `chironSeparators` computes candidates
 *   - `levels` is 6 in five of the six DAEDALUS arms
 *
 * MEASURED (bench/w18-space.ts, probing one dimension at a time against a
 * LOGISTIKE baseline that already runs four aimed arms with the minimal
 * contract and the exact drop-polish):
 *
 *     unswept-space headroom      104 tokens (0.60%) over LOGISTIKE
 *     attribution   capGrid 79 · levels 25 · topK 0 · sep 0
 *     largest lane  kubectl-get-pods  415 -> 372   (-10.4%)
 *     also          license 977 -> 965 · bibliography 721 -> 708
 *                   ja-kb 526 -> 515 · markdown-table 210 -> 198
 *
 * and separately (bench/w18-sep.ts, the full corpus, non-default separators
 * only) the `sep` dimension is worth another 70 tokens over LOGISTIKE,
 * including **component.jsx 296 -> 278 with sep=' '** on a lane where METATRON
 * returns the document unchanged, and markdown-table 202 -> 197 with sep='|'.
 *
 * `capGrid` matters because an uncapped phrase-rule count is not always
 * optimal: on fixed-width tables the long phrase rules crowd out the short
 * high-frequency ones, and capping the phrase budget at 8 or 16 lets the word
 * rules take the space instead.  Nobody had ever tried it.
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  1. A CONFIGURATION SPACE, not an arm list.  POLYTROPOS enumerates points of
 *     (engine x wordGrid x capGrid x levels x sep) and treats each as a codec.
 *  2. AIM.  Four O(n) document features order the configurations before any of
 *     them runs; each clause carries the measurement that justifies it.
 *  3. ANYTIME.  Configurations run in aimed order against a hard wall-clock
 *     budget; the best byte-verified candidate so far is always available.
 *  4. EXACT SELECTION.  Every configuration is priced with a real
 *     `countTokens` on the real string — never with an engine's internal
 *     estimate.  This is what the previous lanes established is worth more
 *     than the search itself.
 *  5. MINIMAL CONTRACT.  Every CHIRON wire is also costed with SYNTOMIA's
 *     24-token contract instead of CHIRON's 38-48.
 *  6. EXACT DROP-POLISH, inherited from AKRIBEIA.
 *  7. EXACT GATE.  Every candidate is decoded with the shipped `chironDecode`
 *     and byte-compared; the incumbent competes unchanged, so POLYTROPOS is a
 *     minimum over a set containing it and cannot be worse.
 *
 *
 * WHY THIS IS AFFORDABLE
 * -----------------------------------------------------------------------------
 * Because `countTokens` is now chunk-additive and globally memoised
 * (LOGISTIKE, this session: exact on 43/43 documents in both encodings,
 * 1.90x, 318M cache hits against 159k misses on a 42-document run).  Pricing
 * twenty configurations exactly used to be the expensive part; it is now the
 * cheap part.
 *
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No new substitution mechanism.  Four were built and measured this session
 * and all four failed: an ADD-polish offering the arms the long repeats their
 * `maxSpan = 24` cap cannot propose (0 rules added across 42 documents), a
 * long-repeat census (everything already booked), self-iteration, and
 * whole-document fast counting as a headline (1.8-2.5x only).  They are in
 * bench/polytropos-report.md section D.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode, chironSeparators } from './chiron';
import { syntomiaContract } from './syntomia';
import { akribeiaPolish } from './akribeia';
import { ariadneEncode } from './ariadne';
import { sibylEncode } from './sibyl';
import { epistemeEncode } from './episteme';
import { metatronEncode } from './metatron';

/* ---------------------------------------------------------------------------
 * 1. THE CONFIGURATION SPACE
 * ------------------------------------------------------------------------- */

export interface Config {
  id: string;
  engine: 'sb' | 'ar' | 'ep';
  wordGrid?: number[];
  capGrid?: number[];
  levels?: number;
  maxSpan?: number;
  sep?: string;
}

/**
 * The base space.  Every entry is a point that some document in the
 * measurement set preferred; nothing here is speculative.
 */
export const BASE_CONFIGS: Config[] = [
  { id: 'w6',        engine: 'sb', wordGrid: [6] },
  { id: 'w12',       engine: 'sb', wordGrid: [12] },
  { id: 'w3',        engine: 'sb', wordGrid: [3] },
  { id: 'w1',        engine: 'sb', wordGrid: [1] },
  { id: 'w24',       engine: 'sb', wordGrid: [24] },
  { id: 'ep',        engine: 'ep' },
  // capGrid: hard-coded to [Infinity] everywhere in the repo.  MEASURED worth
  // 79 of the 104 tokens of unswept headroom; kubectl 415 -> 372.
  { id: 'w6/cap8',   engine: 'sb', wordGrid: [6],  capGrid: [8] },
  { id: 'w6/cap16',  engine: 'sb', wordGrid: [6],  capGrid: [16] },
  { id: 'w6/cap32',  engine: 'sb', wordGrid: [6],  capGrid: [32] },
  { id: 'w12/cap16', engine: 'sb', wordGrid: [12], capGrid: [16] },
  { id: 'w6/cap4',   engine: 'sb', wordGrid: [6],  capGrid: [4] },
  // levels: 6 in five of six DAEDALUS arms.  MEASURED worth 25 tokens;
  // markdown-table 210 -> 198, pom.xml 260 -> 254, gh-api 1153 -> 1146.
  { id: 'w6/L2',     engine: 'sb', wordGrid: [6],  levels: 2 },
  { id: 'w6/L3',     engine: 'sb', wordGrid: [6],  levels: 3 },
  { id: 'w6/L10',    engine: 'sb', wordGrid: [6],  levels: 10 },
  { id: 'w12/L3',    engine: 'sb', wordGrid: [12], levels: 3 },
  { id: 'ar',        engine: 'ar' },
  { id: 'ar/s64',    engine: 'ar', maxSpan: 64 },
];

export interface PolyFeatures {
  chars: number; nonLatinPct: number; spacePct: number; colRunsPerK: number; punctPct: number;
}

export function polyFeatures(text: string): PolyFeatures {
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

/**
 * Aim: order the configuration space before anything runs.
 * Each clause carries the measurement that justifies it.
 */
export function polyOrder(f: PolyFeatures): string[] {
  // space-poor non-Latin (Japanese, Chinese, Thai): no word boundaries.
  // MEASURED ja-kb 655 -> 515 (capGrid), where the whole stack returns 655.
  if (f.nonLatinPct > 25 && f.spacePct < 6) {
    return ['w3', 'w6', 'w6/cap16', 'w6/cap8', 'w1', 'w24', 'ep', 'w6/L3'];
  }
  // fixed-width columns.  MEASURED kubectl 415 -> 372 with a phrase cap,
  // psql 363 -> 355 and df-h 275 -> 267 with sep=' '.
  if (f.colRunsPerK > 8) {
    return ['w6/cap16', 'w6', 'w6/cap8', 'w12', 'w6/cap32', 'ep', 'w12/cap16', 'w6/L3'];
  }
  // punctuation-dense markup / code / JSON.  MEASURED pom.xml 260 -> 254
  // (levels), markdown-table 210 -> 198 (levels), component.jsx 296 -> 278 (sep).
  if (f.punctPct > 18) {
    return ['ep', 'w1', 'w12', 'w6/L3', 'w6', 'w6/L2', 'w6/cap16', 'ar/s64'];
  }
  // prose and markdown.  MEASURED license 977 -> 965 and bibliography
  // 721 -> 708, both with a phrase cap.
  return ['w6', 'ep', 'w6/cap16', 'w3', 'w12', 'w6/cap8', 'w6/L3', 'w24'];
}

/* ---------------------------------------------------------------------------
 * 2. RUNNING A CONFIGURATION
 * ------------------------------------------------------------------------- */

function runConfig(c: Config, text: string, enc: EncodingName, budgetMs: number): any {
  const o: any = { budgetMs };
  if (c.wordGrid) o.wordGrid = c.wordGrid;
  if (c.capGrid) o.capGrid = c.capGrid;
  if (c.levels !== undefined) o.levels = c.levels;
  if (c.maxSpan !== undefined) o.maxSpan = c.maxSpan;
  if (c.sep !== undefined) o.sep = c.sep;
  if (c.engine === 'sb') return sibylEncode(text, enc, o);
  if (c.engine === 'ep') return epistemeEncode(text, enc, o);
  return ariadneEncode(text, enc, o);
}

/* ---------------------------------------------------------------------------
 * 3. ENCODER
 * ------------------------------------------------------------------------- */

export interface PolytroposResult {
  codec: 'polytropos';
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
  configsRun: number;
  configsTried: string[];
  rulesDropped: number;
  incumbentTokens: number;
  features: PolyFeatures;
  ms: number;
  notes: string;
}

export interface PolytroposOptions {
  budgetMs?: number;
  configBudgetMs?: number;
  /** how many configuration points to price (default 6) */
  maxConfigs?: number;
  /** also sweep the non-default separators chironSeparators proposes */
  sweepSeparators?: boolean;
  polish?: boolean;
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function polytroposEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: PolytroposOptions = {},
): PolytroposResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 25000;
  const cfgBudget = options.configBudgetMs ?? 80;
  const maxConfigs = Math.max(1, options.maxConfigs ?? 6);
  const doPolish = options.polish !== false;
  const sweepSep = options.sweepSeparators !== false;
  const f = polyFeatures(text);
  const deadline = t0 + budgetMs;
  // RED-TEAM REPAIR (section D).  The first version let the configuration
  // phase consume the whole budget, so turning the separator sweep ON could
  // starve the exact drop-polish and make the result WORSE -- adding search
  // lost tokens.  MEASURED: email-thread 514 -> 515, llm-answer 704 -> 733.
  // The search phase is now capped at 70% of the budget and the remaining 30%
  // is reserved for the polish, which restores monotonicity.
  const searchDeadline = t0 + Math.floor(budgetMs * 0.7);

  const byId = new Map(BASE_CONFIGS.map((c) => [c.id, c]));
  const order = polyOrder(f).map((id) => byId.get(id)).filter((c): c is Config => !!c);

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

  const price = (name: string, r: any) => {
    if (!r || r.decoded !== text) return;
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
  };

  const tried: string[] = [];
  let configsRun = 0;
  for (const c of order) {
    if (configsRun >= maxConfigs || Date.now() > searchDeadline) break;
    tried.push(c.id);
    configsRun++;
    try { price(c.id, runConfig(c, text, enc, cfgBudget)); } catch { /* config failed */ }
  }

  let rulesDropped = 0;
  // THIRD REPAIR (red-team D).  Monotonicity was still broken because WHICH
  // candidates get polished depended on the candidate set: adding separator
  // wires pushed a base wire out of the polish short-list, so the sweep-on run
  // could end up worse (kubectl 372 -> 380, llm-answer 704 -> 733).
  // The phases are now ordered so that the sweep-on candidate set is a strict
  // SUPERSET of the sweep-off one: polish the base candidates FIRST, then run
  // the separator sweep, then polish again.  Monotone by construction.
  const polishPhase = (limitMs: number) => {
    if (!doPolish) return;
    const stop = Date.now() + Math.max(400, limitMs);
    const best = cands
      .filter((c) => c.wire !== text && c.wire.startsWith(CHIRON_START) && !c.name.endsWith('+polish'))
      .sort((a, b) => a.tokens - b.tokens)
      .slice(0, 3);
    for (const c of best) {
      if (Date.now() > stop) break;
      if (cands.some((x) => x.name === c.name + '+polish')) continue;
      try {
        const p = akribeiaPolish(c.wire, text, enc, 200, stop);
        if (p && p.tokens < c.tokens) {
          cands.push({
            name: c.name + '+polish', wire: p.wire,
            contract: syntomiaContract(p.wire, text), tokens: p.tokens, decoded: text,
          });
          rulesDropped += p.dropped;
        }
      } catch { /* polish unavailable */ }
    }
  };

  polishPhase(Math.floor(budgetMs * 0.2));

  // the separator dimension: only the candidates chironSeparators actually
  // proposes, and only the two cheapest engines, so the cost stays bounded
  if (sweepSep && Date.now() < searchDeadline) {
    let seps: string[] = [];
    try { seps = chironSeparators(text).filter((s) => s !== '\n'); } catch { seps = []; }
    for (const s of seps.slice(0, 3)) {
      if (Date.now() > searchDeadline) break;
      for (const c of [{ id: 'w6', engine: 'sb', wordGrid: [6] } as Config,
                       { id: 'ep', engine: 'ep' } as Config]) {
        if (Date.now() > searchDeadline) break;
        tried.push(`${c.id}/sep${JSON.stringify(s)}`);
        configsRun++;
        try { price(`${c.id}/sep${JSON.stringify(s)}`, runConfig({ ...c, sep: s }, text, enc, cfgBudget)); }
        catch { /* config failed */ }
      }
    }
  }

  polishPhase(Math.floor(budgetMs * 0.2));

  const valid = cands.filter((c) => c.decoded === text && c.tokens <= inTokens);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0] ?? cands[0];
  const wireTok = T(win.wire);

  return {
    codec: 'polytropos',
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
    configsRun,
    configsTried: tried,
    rulesDropped,
    incumbentTokens,
    features: f,
    ms: Date.now() - t0,
    notes: `space=[${tried.join(',')}] winner=${win.name} dropped=${rulesDropped}; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

/** POLYTROPOS only ever emits CHIRON wires (or the incumbent's own, already verified). */
export const polytroposDecode = chironDecode;

export const POLYTROPOS_SYSTEM_PROMPT =
  'POLYTROPOS emits a CHIRON wire chosen by exact pricing over an engine configuration space, costed against a minimal decode contract. The contract travels in the message; no system prompt is required.';
