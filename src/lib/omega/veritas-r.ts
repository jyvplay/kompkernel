/**
 * VERITAS-R (Z34): new codec. Its own sentinel `[[VXR`, a 28-token legend, and the VERITAS-S search
 * with two additions measured in Z34: (a) key reassignment and entry pruning after the greedy pass,
 * (b) a final gate against the raw input that counts the whole wire (legend and header included).
 *
 * Wire: `[[VXR` line, legend line, header lines `X<escaped T>` (nested), `]]`, body.
 * Decoder: the shared VXC/VXS/VXR nested-header path (veritasADecode). Encoder self-checks exactness.
 *
 * This is a search, not an optimum: greedy by exact token count, then local refinement. It is not a tournament
 * over codecs or arms.
 */
import { countTokens, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXC_SENTINEL, VXN_SENTINEL, VXR_SENTINEL, VXS_SENTINEL } from './veritas-a';
import { TERMINATOR } from './veritas-u';
import { nestedHeaderPhrases } from './veritas-n';
import { rankedCandidatesS, removeEntryS, rekeyEntryS, type VeritasSEntry } from './veritas-s';

export const VXR_LEGEND = '# VXR: X=T in header; X in text means T; ~~ ~, ~N nl, ~R cr; ]] ends';

/**
 * Search knobs for the VXR greedy and refinement. All are deterministic budgets (counts, never wall-clock).
 * DEFAULT_VXR_OPTS is the shipped VERITAS-R search; the decoder is identical for every setting.
 */
export interface VxrSearchOptions {
  /** Alias keys offered to the greedy. */
  poolMax: number;
  /** Greedy step stops scanning after this many improving candidates; the best of them is taken. */
  kImprove: number;
  /** Greedy step stops after this many candidate trials. */
  maxTrials: number;
  /** Exact-count budget for refinement (prune and key-reassignment evaluations). */
  refineBudget: number;
  /** Look-past: after the greedy has no improving step, take up to this many best non-improving steps and keep the lowest-count state. 0 = off. */
  forceSteps?: number;
  /** Key pool order: 'codepoint' (default) or 'cyrillic' (single-token Cyrillic keys first, so adjacent keys can merge). */
  pool?: 'codepoint' | 'cyrillic';
  /** Key-swap hill-climb after refinement: exchange keys of two used entries, keep on exact count drop, decode-gated. */
  swapPass?: boolean;
}
export const DEFAULT_VXR_OPTS: VxrSearchOptions = { poolMax: 240, kImprove: 10, maxTrials: 300, refineBudget: 4000 };

export interface VeritasRResult {
  wire: string;
  decoded: string;
  exact: boolean;
  entries: number;
  inTokens: number;
  outTokens: number;
  trials: number;
  refine: { prunes: number; rekeys: number };
}

/** VXR wire for an entry list and an escaped body. */
export function wireR(entries: VeritasSEntry[], body: string): string {
  const nh = nestedHeaderPhrases(entries);
  const head = entries.length ? entries.map((e) => e.key + escHeader(nh.get(e.key)!)).join('\n') + '\n' : '';
  return VXR_SENTINEL + VXR_LEGEND + '\n' + head + TERMINATOR + '\n' + body;
}

export function veritasREncode(text: string, enc: EncodingName = 'o200k_base'): VeritasRResult {
  return veritasREncodeWith(text, enc, DEFAULT_VXR_OPTS);
}

/** VXR encoder with explicit search budgets. Same wire and decoder for every setting; exact whole-wire gate. */
export function veritasREncodeWith(text: string, enc: EncodingName, opts: VxrSearchOptions): VeritasRResult {
  const inTokens = countTokens(text, enc);
  const finish = (wire: string, entries: number, trials: number, refine: { prunes: number; rekeys: number }): VeritasRResult => {
    const decoded = veritasADecode(wire);
    return { wire, decoded, exact: decoded === text, entries, inTokens, outTokens: countTokens(wire, enc), trials, refine };
  };
  const wrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL) || text.startsWith(VXS_SENTINEL) || text.startsWith(VXR_SENTINEL);
  const raw = () => finish(wrap ? wireR([], escBody(text)) : text, 0, 0, { prunes: 0, rekeys: 0 });
  if (text.length === 0) return finish(text, 0, 0, { prunes: 0, rekeys: 0 });
  const basePool = aliasPool(enc).filter((c) => !text.includes(c));
  const cyrFirst = (c: string) => { const k = c.codePointAt(0)!; return k >= 0x400 && k <= 0x4ff; };
  const pool = (opts.pool === 'cyrillic' ? [...basePool.filter(cyrFirst), ...basePool.filter((c) => !cyrFirst(c))] : basePool).slice(0, opts.poolMax);
  let st = { entries: [] as VeritasSEntry[], body: escBody(text) };
  let cur = countTokens(wireR([], st.body), enc);
  let trialsTot = 0;
  const forceSteps = opts.forceSteps ?? 0;
  let forced = 0, bestCount = Infinity, bestState: typeof st | null = null;
  // Greedy: best improving candidate per step, scanning the ranked list until kImprove improve or maxTrials are tried.
  while (st.entries.length < pool.length) {
    const ranked = rankedCandidatesS(st.body, enc);
    const key = pool[st.entries.length];
    const improving: { phrase: string; body: string; t: number }[] = [];
    const allTrials: { phrase: string; body: string; t: number }[] = [];
    let trials = 0;
    for (const c of ranked) {
      if (improving.length >= opts.kImprove || trials >= opts.maxTrials) break;
      const parts = st.body.split(escBody(c.phrase));
      if (parts.length - 1 < 2) continue;
      trials++;
      const cb = parts.join(key);
      const t = countTokens(wireR([...st.entries, { key, phrase: c.phrase }], cb), enc);
      if (t < cur) improving.push({ phrase: c.phrase, body: cb, t });
      allTrials.push({ phrase: c.phrase, body: cb, t });
    }
    trialsTot += trials;
    let pick: { phrase: string; body: string; t: number } | null = null;
    if (improving.length > 0) pick = improving.reduce((a, b) => (b.t < a.t ? b : a));
    else if (forced < forceSteps && allTrials.length > 0) { pick = allTrials.reduce((a, b) => (b.t < a.t ? b : a)); forced++; }
    if (!pick) break;
    cur = pick.t;
    st = { entries: [...st.entries, { key, phrase: pick.phrase }], body: pick.body };
    if (cur < bestCount) { bestCount = cur; bestState = st; }
  }
  // Look-past returns the lowest-count state seen on the trajectory (identical to the final state when forceSteps = 0).
  if (bestState) st = bestState;
  if (st.entries.length === 0) return raw();
  // Refinement: prune entries and reassign keys while the exact wire count improves.
  // Deterministic budget: at most opts.refineBudget exact counts, so the output does not depend on machine speed.
  let evals = 0;
  const cost = (s: { entries: VeritasSEntry[]; body: string }) => { evals++; return countTokens(wireR(s.entries, s.body), enc); };
  let c0 = cost(st), prunes = 0, rekeys = 0, improved = true;
  while (improved && evals < opts.refineBudget) {
    improved = false;
    for (let i = 0; i < st.entries.length && evals < opts.refineBudget; i++) {
      const c = removeEntryS(st, i); const t = cost(c);
      if (t < c0) { st = c; c0 = t; prunes++; improved = true; i--; }
    }
    for (let i = 0; i < st.entries.length && !improved && evals < opts.refineBudget; i++) {
      const used = new Set(st.entries.map((e) => e.key));
      for (const k of pool) {
        if (used.has(k)) continue;
        if (evals >= opts.refineBudget) break;
        const c = rekeyEntryS(st, i, k); const t = cost(c);
        if (t < c0) { st = c; c0 = t; rekeys++; improved = true; break; }
      }
    }
  }
  if (opts.swapPass) {
    // Key-swap hill-climb: exchange the keys of two used entries (and their body occurrences). Keep only swaps that
    // lower the exact count AND decode back to the input, because header nesting depends on key order.
    let ents = st.entries.map((e) => ({ ...e }));
    let body = st.body;
    let c = countTokens(wireR(ents, body), enc);
    let improvedSw = true, passes = 0;
    while (improvedSw && passes < 6) {
      improvedSw = false; passes++;
      for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) {
        const ka = ents[i].key, kb = ents[j].key;
        const nb = Array.from(body, (ch) => (ch === ka ? kb : ch === kb ? ka : ch)).join('');
        const ne = ents.map((e, k) => (k === i ? { ...e, key: kb } : k === j ? { ...e, key: ka } : e));
        const t = countTokens(wireR(ne, nb), enc);
        if (t >= c) continue;
        let okDec = false;
        try { okDec = veritasADecode(wireR(ne, nb)) === text; } catch { okDec = false; }
        if (okDec) { ents = ne; body = nb; c = t; improvedSw = true; }
      }
    }
    st = { entries: ents, body };
  }
  const wire = wireR(st.entries, st.body);
  // Final gate: the whole wire must beat the raw input, otherwise emit the input verbatim.
  if (countTokens(wire, enc) >= inTokens) return raw();
  return finish(wire, st.entries.length, trialsTot, { prunes, rekeys });
}

/** Decode a VXR wire (or any wire VERITAS-A accepts). */
export function veritasRDecode(wire: string): string {
  return veritasADecode(wire);
}
