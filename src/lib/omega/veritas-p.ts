/**
 * src/lib/omega/veritas-p.ts — VERITAS-P (Z39): VERITAS-R wire, shipped decoder, wide exact search at full scale.
 * =============================================================================
 * WHAT IS NEW (measured in Z39, not inherited)
 *
 *   Z38 measured VERITAS-Q against the frontier and found a size-dependent gap: 0-2% below ~1.5k tokens, 8-17% above
 *   ~4k tokens (fresh npm docs, package-lock). The cause is the search gate, not the wire: VERITAS-M runs its wide
 *   search only for inputs of at most 10 000 characters; larger inputs fall back to the narrow default
 *   (kImprove 10, maxTrials 300, no look-past, no swap pass). The wide search was never tried on large inputs,
 *   because every trial re-tokenised the whole wire (about 4 ms per exact count on a 14k-token file, times thousands
 *   of trials per greedy step).
 *
 *   VERITAS-P removes that cost with an exact-acceptance / estimated-ranking split:
 *     (a) trials are ranked by a per-line token estimate: the change from one candidate touches only the lines that
 *         contain the phrase, so the delta is a sum over those lines (memoised line counts; O(occurrences) per trial);
 *     (b) every accepted step, every look-past state, every refinement move and the final wire are checked with the
 *         FULL exact o200k count of the whole wire (countTokens(wire)). The estimate never decides a result; it only
 *         orders trials. Measured bias of the per-line sum on the full wire is reported by the bench (it is not zero:
 *         newlines merge with neighbouring tokens).
 *     (c) the wire is the VERITAS-R wire with the VERITAS-Q legend rewrite; the decoder is veritasRDecode, unchanged.
 *
 * Search (all budgets are counts, never wall-clock):
 *   greedy: for each step, rank candidates with the shared VERITAS-S ranking, estimate every candidate (up to
 *           maxTrials), take the best estimated improvement; if none, take a non-improving step (look-past, up to
 *           forceSteps total); keep the trajectory state with the lowest EXACT count.
 *   refine: prune entries and reassign keys while the exact count drops (budget refineBudget exact counts).
 *   swap:   exchange keys of two entries; keep a swap only if the exact count drops and the decoder returns the input.
 *   gate:   the final wire must decode to the input and must count below the raw input; otherwise emit the input.
 *
 * Not claimed: this is not an optimum (greedy with look-past and local refinement). It is not a tournament: one search
 * per input, no arm portfolio, no min over codecs.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXC_SENTINEL, VXN_SENTINEL, VXR_SENTINEL, VXS_SENTINEL } from './veritas-a';
import { wireR } from './veritas-r';
import { removeEntryS, rekeyEntryS, type VeritasSEntry } from './veritas-s';
import { tokenStrings } from './bpe';
import { charCandidates } from './veritas-c';
import type { Cand } from './veritas-u';
import { vxqRewireLegend } from './veritas-q';

export interface VeritasPOptions {
  /** Keys offered to the greedy (single-token alias characters not present in the input). */
  poolMax: number;
  /** Candidate trials per greedy step (estimated, ranked order). */
  maxTrials: number;
  /** Look-past: non-improving steps allowed in total. */
  forceSteps: number;
  /** Exact-count budget for refinement (prune and rekey evaluations). */
  refineBudget: number;
  /** Key-swap hill-climb with exact counts and decode gate. */
  swapPass: boolean;
  /** Maximum swap evaluations (exact counts) per pass. */
  swapBudget: number;
  /** Token-window anchors kept per window size (most frequent first). VERITAS-S used 240. */
  anchorCap: number;
  /** Short non-aligned strings (1..3 chars) offered per step. */
  shortN: number;
  /** Acceptance model for trials: 'line' = exact-count delta on the affected lines (default);
   *  'symbol' = token-count model (uses x (tokens(phrase)-1) saved, header tokens(phrase)+1 paid). Best state is always chosen by the exact count. */
  model?: 'line' | 'symbol';
  /** Optional progress sink (bench only; never affects the output). */
  trace?: (msg: string) => void;
}

export const DEFAULT_VXP_OPTS: VeritasPOptions = {
  poolMax: 440, maxTrials: 1000, forceSteps: 40, refineBudget: 40000, swapPass: true, swapBudget: 6000, anchorCap: 240, shortN: 300,
};

export interface VeritasPResult {
  wire: string;
  decoded: string;
  exact: boolean;
  entries: number;
  inTokens: number;
  outTokens: number;
  legend: 'minimal' | 'escape' | 'none';
  trials: number;
  steps: number;
  forced: number;
  refine: { prunes: number; rekeys: number; swaps: number };
  /** true when the final wire is the identity (raw) wire */
  raw: boolean;
}


const P_WINDOWS = [2, 3, 4];
const P_POS_CAP = 64;
const P_EXT_CAP = 32;
const P_MINE_CAP = 220000;
const P_K_RADIX = 200100;
const P_SHORT_MIN_COUNT = 4;

/** VERITAS-S window candidates with the anchor cap as a parameter (same rules; the cap is the only change). */
function windowCandsP(toks: { id: number; s: string }[], W: number, out: Map<string, Cand>, anchorCap: number): void {
  const T = Math.min(toks.length, P_MINE_CAP);
  const anchors = new Map<number, { c: number; pos: number[] }>();
  if (T >= W) {
    for (let i = 0; i + W <= T; i++) {
      let key = 0;
      let skip = false;
      for (let t = 0; t < W; t++) {
        const id = toks[i + t].id;
        if (id >= P_K_RADIX) { skip = true; break; }
        key = key * P_K_RADIX + id;
      }
      if (skip) continue;
      const cur = anchors.get(key);
      if (cur) { cur.c++; if (cur.pos.length < P_POS_CAP) cur.pos.push(i); } else anchors.set(key, { c: 1, pos: [i] });
    }
  }
  const hot = [...anchors.values()].filter((a) => a.c >= 2).sort((x, y) => y.c - x.c).slice(0, anchorCap);
  for (const a of hot) {
    const p0 = a.pos[0];
    let bestLen = W;
    for (let len = W + 1; len <= P_EXT_CAP && p0 + len <= T; len++) {
      let share = 1;
      for (let j = 1; j < a.pos.length; j++) {
        const pj = a.pos[j];
        if (pj + len > T || pj < p0 + len) continue;
        let eq = true;
        for (let t = W; t < len; t++) if (toks[p0 + t].id !== toks[pj + t].id) { eq = false; break; }
        if (eq) share++;
      }
      if (share >= 2) bestLen = len; else break;
    }
    for (const len of bestLen === W ? [W] : [bestLen, W]) {
      let phrase = '';
      for (let t = 0; t < len; t++) phrase += toks[p0 + t].s;
      if (phrase.length < 4) continue;
      const prev = out.get(phrase);
      if (!prev || prev.anchorHits < a.c) out.set(phrase, { phrase, win: len, anchorHits: a.c });
    }
  }
}

function shortCandsP(body: string, n: number): Cand[] {
  const cnt = new Map<string, number>();
  for (let L = 1; L <= 3; L++) {
    for (let i = 0; i + L <= body.length; i++) {
      const s = body.slice(i, i + L);
      if (s.includes('~') || s.includes('\n')) continue;
      cnt.set(s, (cnt.get(s) ?? 0) + 1);
    }
  }
  return [...cnt.entries()]
    .filter(([, c]) => c >= P_SHORT_MIN_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([phrase, c]) => ({ phrase, win: 1, anchorHits: c }));
}

/** Ranked candidates for one greedy step (VERITAS-S ranking; anchor cap and short-string count are parameters). */
export function rankedCandidatesP(body: string, enc: EncodingName, anchorCap: number, shortN: number): Cand[] {
  const toks = tokenStrings(body, enc);
  const tm = new Map<string, Cand>();
  for (const W of P_WINDOWS) windowCandsP(toks, W, tm, anchorCap);
  const list = [...tm.values(), ...charCandidates(body, enc), ...shortCandsP(body, shortN)];
  const seen = new Set<string>();
  const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
  return list
    .filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
    .filter((c) => c.anchorHits >= 2)
    .sort((x, y) => score(y) - score(x));
}

/** Per-line memo of o200k counts. Keyed by the line text with its newline appended (the estimate's unit). */
class LineCount {
  private memo = new Map<string, number>();
  constructor(private enc: EncodingName) {}
  of(line: string): number {
    const k = line + '\n';
    const hit = this.memo.get(k);
    if (hit !== undefined) return hit;
    if (this.memo.size > 400000) this.memo.clear();
    const v = countTokens(k, this.enc);
    this.memo.set(k, v);
    return v;
  }
}

interface PState { entries: VeritasSEntry[]; body: string }

/** Exact whole-wire count of a VXR wire for a state. */
function exactCount(st: PState, enc: EncodingName): number {
  return countTokens(wireR(st.entries, st.body), enc);
}

/**
 * Greedy search. Returns the lowest-exact-count state of the trajectory.
 * Estimates rank trials; exact counts decide every accepted state.
 */
function greedy(text: string, enc: EncodingName, pool: string[], opts: VeritasPOptions, lc: LineCount) {
  let st: PState = { entries: [], body: escBody(text) };
  let bestExact = exactCount(st, enc);
  let best: PState = st;
  let trials = 0, steps = 0, forced = 0;
  while (st.entries.length < pool.length) {
    const key = pool[st.entries.length];
    const cands = rankedCandidatesP(st.body, enc, opts.anchorCap, opts.shortN);
    const lines = st.body.split('\n');
    const lineCost = lines.map((l) => lc.of(l));
    // line start offsets: occurrences of a candidate are found with native indexOf and mapped to line numbers
    const lineStart = new Array<number>(lines.length);
    { let o = 0; for (let i = 0; i < lines.length; i++) { lineStart[i] = o; o += lines[i].length + 1; } }
    const lineOf = (pos: number) => { let lo = 0, hi = lines.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStart[mid] <= pos) lo = mid; else hi = mid - 1; } return lo; };
    const hdr = (phrase: string) => lc.of(key + escHeader(phrase));
    let bestImp: { t: number; pb: string; phrase: string } | null = null;
    let bestAny: { t: number; pb: string; phrase: string } | null = null;
    let n = 0;
    for (const c of cands) {
      if (n >= opts.maxTrials) break;
      // phrases with a newline are not line-local; they are never accepted by the estimate (VERITAS-R rule kept)
      if (c.phrase.includes('\n')) continue;
      const pb = escBody(c.phrase);
      if (!pb.length) continue;
      // occurrences in the whole body (the VERITAS-R rule: a phrase must occur at least twice)
      // non-overlapping left-to-right occurrences in the whole body (the VERITAS-R rule), as split/join counts them
      let occ = 0;
      const hitLines: number[] = [];
      let p = st.body.indexOf(pb);
      while (p !== -1) {
        occ++;
        const li = lineOf(p);
        if (hitLines.length === 0 || hitLines[hitLines.length - 1] !== li) hitLines.push(li);
        p = st.body.indexOf(pb, p + pb.length);
      }
      if (occ < 2) continue;
      n++;
      trials++;
      // delta over the lines that contain the phrase (phrases that contain a newline are estimated the same way:
      // split on the whole body would be exact, so they are handled by the exact acceptance below)
      let delta = hdr(c.phrase);
      if (opts.model === 'symbol') {
        const pt = countTokens(c.phrase, enc);
        delta = (pt + 1) - occ * (pt - 1);
      } else {
        for (const i of hitLines) {
          const nl = lines[i].split(pb).join(key);
          delta += lc.of(nl) - lineCost[i];
        }
      }
      if (delta < 0 && (!bestImp || delta < bestImp.t)) bestImp = { t: delta, pb, phrase: c.phrase };
      if (!bestAny || delta < bestAny.t) bestAny = { t: delta, pb, phrase: c.phrase };
    }
    let pick = bestImp;
    if (!pick) {
      if (forced >= opts.forceSteps || !bestAny) break;
      pick = bestAny;
      forced++;
    }
    const nb = st.body.split(pick.pb).join(key);
    st = { entries: [...st.entries, { key, phrase: pick.phrase }], body: nb };
    steps++;
    const ex = exactCount(st, enc);
    if (ex < bestExact) { bestExact = ex; best = st; }
    if (opts.trace) opts.trace(`step ${steps} key=${key} phrase=${JSON.stringify(pick.phrase).slice(0, 40)} cands=${cands.length} trials=${trials} forced=${forced} exact=${ex}`);
  }
  return { state: best, trials, steps, forced };
}

/** Cheap estimate of a state (line-memoised body count + key lines); used only to rank refinement moves. */
function estState(st: PState, lc: LineCount): number {
  let t = 0;
  for (const l of st.body.split('\n')) t += lc.of(l);
  for (const e of st.entries) t += lc.of(e.key + escHeader(e.phrase));
  return t;
}

/**
 * Refinement: prune entries and reassign keys while the count drops. A move is ranked by the estimate and ACCEPTED only
 * if the exact whole-wire count also drops (so the estimate can never make the result worse).
 */
function refine(st0: PState, pool: string[], enc: EncodingName, budget: number, lc: LineCount) {
  let st = st0;
  let evals = 0, prunes = 0, rekeys = 0, exactChecks = 0;
  let ex0 = exactCount(st, enc), es0 = estState(st, lc);
  const tryMove = (c: PState): boolean => {
    evals++;
    const es = estState(c, lc);
    if (es >= es0) return false;
    exactChecks++;
    const ex = exactCount(c, enc);
    if (ex >= ex0) return false;
    st = c; es0 = es; ex0 = ex;
    return true;
  };
  let improved = true;
  while (improved && evals < budget) {
    improved = false;
    for (let i = 0; i < st.entries.length && evals < budget; i++) {
      if (tryMove(removeEntryS(st, i))) { prunes++; improved = true; i--; }
    }
    for (let i = 0; i < st.entries.length && !improved && evals < budget; i++) {
      const used = new Set(st.entries.map((e) => e.key));
      for (const k of pool) {
        if (used.has(k)) continue;
        if (evals >= budget) break;
        if (tryMove(rekeyEntryS(st, i, k))) { rekeys++; improved = true; break; }
      }
    }
  }
  return { state: st, prunes, rekeys, exactChecks };
}

/** Key-swap hill-climb on exact counts, decode-gated (header nesting depends on key order). */
function swapPass(text: string, st0: PState, enc: EncodingName, budget: number) {
  let ents = st0.entries.map((e) => ({ ...e }));
  let body = st0.body;
  let c = exactCount({ entries: ents, body }, enc);
  let swaps = 0, evals = 0, improvedSw = true, passes = 0;
  while (improvedSw && passes < 6 && evals < budget) {
    improvedSw = false; passes++;
    for (let i = 0; i < ents.length && evals < budget; i++) for (let j = i + 1; j < ents.length && evals < budget; j++) {
      const ka = ents[i].key, kb = ents[j].key;
      const nb = Array.from(body, (ch) => (ch === ka ? kb : ch === kb ? ka : ch)).join('');
      const ne = ents.map((e, k) => (k === i ? { ...e, key: kb } : k === j ? { ...e, key: ka } : e));
      evals++;
      const t = countTokens(wireR(ne, nb), enc);
      if (t >= c) continue;
      let okDec = false;
      try { okDec = veritasADecode(wireR(ne, nb)) === text; } catch { okDec = false; }
      if (okDec) { ents = ne; body = nb; c = t; improvedSw = true; swaps++; }
    }
  }
  return { state: { entries: ents, body } as PState, swaps };
}

/** Search only (no wire, no gate): the final state after greedy, refinement and swap, with stats. Used by benches. */
export function veritasPSearch(text: string, enc: EncodingName = 'o200k_base', opts: VeritasPOptions = DEFAULT_VXP_OPTS) {
  const basePool = aliasPool(enc).filter((c) => !text.includes(c));
  const cyr = (c: string) => { const k = c.codePointAt(0)!; return k >= 0x400 && k <= 0x4ff; };
  const pool = [...basePool.filter(cyr), ...basePool.filter((c) => !cyr(c))].slice(0, opts.poolMax);
  const lc = new LineCount(enc);
  const g = greedy(text, enc, pool, opts, lc);
  const r = refine(g.state, pool, enc, opts.refineBudget, lc);
  let st = r.state;
  if (opts.swapPass) st = swapPass(text, st, enc, opts.swapBudget).state;
  return { state: st, greedy: g, refine: r };
}

export function veritasPEncode(text: string, enc: EncodingName = 'o200k_base', opts: VeritasPOptions = DEFAULT_VXP_OPTS): VeritasPResult {
  const inTokens = countTokens(text, enc);
  const finish = (wire: string, entries: number, trials: number, steps: number, forced: number,
    refineStats: { prunes: number; rekeys: number; swaps: number }, legend: 'minimal' | 'escape' | 'none', raw: boolean): VeritasPResult => {
    const decoded = veritasADecode(wire);
    return { wire, decoded, exact: decoded === text, entries, inTokens, outTokens: countTokens(wire, enc), legend, trials, steps, forced, refine: refineStats, raw };
  };
  const rawResult = (): VeritasPResult => {
    // identity output must be wrapped whenever the decoder would read the input as a wire (same five sentinels as VERITAS-R)
    const wrap = [VXA_SENTINEL, VXN_SENTINEL, VXC_SENTINEL, VXS_SENTINEL, VXR_SENTINEL].some((k) => text.startsWith(k));
    const wire = wrap ? wireR([], escBody(text)) : text;
    const rw = wrap ? vxqRewireLegend(wire) : { wire, legend: 'none' as const };
    return finish(rw.wire, 0, 0, 0, 0, { prunes: 0, rekeys: 0, swaps: 0 }, rw.legend, true);
  };
  if (text.length === 0) return finish(text, 0, 0, 0, 0, { prunes: 0, rekeys: 0, swaps: 0 }, 'none', true);
  const basePool = aliasPool(enc).filter((c) => !text.includes(c));
  const cyr = (c: string) => { const k = c.codePointAt(0)!; return k >= 0x400 && k <= 0x4ff; };
  const pool = [...basePool.filter(cyr), ...basePool.filter((c) => !cyr(c))].slice(0, opts.poolMax);
  const lc = new LineCount(enc);
  const g = greedy(text, enc, pool, opts, lc);
  if (g.state.entries.length === 0) return rawResult();
  const r = refine(g.state, pool, enc, opts.refineBudget, lc);
  let st = r.state;
  let swaps = 0;
  if (opts.swapPass) {
    const s = swapPass(text, st, enc, opts.swapBudget);
    st = s.state; swaps = s.swaps;
  }
  const wire0 = wireR(st.entries, st.body);
  if (countTokens(wire0, enc) >= inTokens) return rawResult();
  const rw = vxqRewireLegend(wire0);
  const finalWire = veritasADecode(rw.wire) === text ? rw.wire : wire0;
  if (countTokens(finalWire, enc) >= inTokens) return rawResult();
  return finish(finalWire, st.entries.length, g.trials, g.steps, g.forced,
    { prunes: r.prunes, rekeys: r.rekeys, swaps }, finalWire === rw.wire ? rw.legend : 'none', false);
}

