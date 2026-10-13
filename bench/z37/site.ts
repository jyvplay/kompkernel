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
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXC_SENTINEL, VXN_SENTINEL, VXR_SENTINEL, VXS_SENTINEL } from '@/lib/omega/veritas-a';
import { TERMINATOR } from '@/lib/omega/veritas-u';
import { nestedHeaderPhrases } from '@/lib/omega/veritas-n';
import { rankedCandidatesS, removeEntryS, rekeyEntryS, type VeritasSEntry } from '@/lib/omega/veritas-s';

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



/** VXR encoder with explicit search budgets. Same wire and decoder for every setting; exact whole-wire gate. */
export function veritasSiteEncode(text: string, enc: EncodingName, opts: VxrSearchOptions): VeritasRResult {
  const inTokens = countTokens(text, enc);
  const finish = (wire: string, entries: number, trials: number, refine: { prunes: number; rekeys: number }): VeritasRResult => {
    const decoded = veritasADecode(wire);
    return { wire, decoded, exact: decoded === text, entries, inTokens, outTokens: countTokens(wire, enc), trials, refine };
  };
  const wrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL) || text.startsWith(VXS_SENTINEL) || text.startsWith(VXR_SENTINEL);
  const raw = () => finish(wrap ? wireR([], escBody(text)) : text, 0, 0, { prunes: 0, rekeys: 0 });
  if (text.length === 0) return finish(text, 0, 0, { prunes: 0, rekeys: 0 });
  const basePool = aliasPool(enc).filter((c) => !text.includes(c));
  const blk = process.env.POOL ?? 'cp';
  const RANGES: Record<string, [number, number]> = { cyr: [0x400, 0x4ff], greek: [0x370, 0x3ff], arabic: [0x600, 0x6ff], armenian: [0x530, 0x58f] };
  const inB = (c: string) => { const r = RANGES[blk]; if (!r) return false; const k = c.codePointAt(0)!; return k >= r[0] && k <= r[1]; };
  const pool = blk === 'cp' ? basePool.slice(0, opts.poolMax) : [...basePool.filter(inB), ...basePool.filter((c) => !inB(c))].slice(0, opts.poolMax);
  let st = { entries: [] as VeritasSEntry[], body: escBody(text) };
  let cur = countTokens(wireR([], st.body), enc);
  let trialsTot = 0;
  // Greedy: best improving candidate per step, scanning the ranked list until kImprove improve or maxTrials are tried.
  const FORCE = Number(process.env.FORCE ?? 0);
  let extra = 0, bestT = Infinity, bestSt: typeof st | null = null;
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
    else if (FORCE > 0 && extra < FORCE && allTrials.length > 0) { pick = allTrials.reduce((a, b) => (b.t < a.t ? b : a)); extra++; }
    if (!pick) break;
    cur = pick.t;
    st = { entries: [...st.entries, { key, phrase: pick.phrase }], body: pick.body };
    if (cur < bestT) { bestT = cur; bestSt = st; }
  }
  if (FORCE > 0 && bestSt) st = bestSt;
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
  if (process.env.SWAP === '1') {
    // Z37 key-swap hill-climb: exchange the keys of two used entries (with their body occurrences), keep if exact count drops.
    let ents = st.entries.map((e) => ({ ...e }));
    let body = st.body;
    const cnt = (en: VeritasSEntry[], b: string) => countTokens(wireR(en, b), enc);
    let c = cnt(ents, body), swapsTried = 0, swapsKept = 0, improved = true, passes = 0;
    while (improved && passes < 6) {
      improved = false; passes++;
      for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) {
        const ka = ents[i].key, kb = ents[j].key;
        const sw = (ch: string) => (ch === ka ? kb : ch === kb ? ka : ch);
        const nb = Array.from(body, sw).join('');
        const ne = ents.map((e, k) => (k === i ? { ...e, key: kb } : k === j ? { ...e, key: ka } : e));
        swapsTried++;
        const t = cnt(ne, nb);
        let okDec = false;
        if (t < c) { try { okDec = veritasADecode(wireR(ne, nb)) === text; } catch { okDec = false; } }
        if (t < c && okDec) { ents = ne; body = nb; c = t; swapsKept++; improved = true; }
        else if (t < c) { (globalThis as any).__swapRejectedDecode = ((globalThis as any).__swapRejectedDecode ?? 0) + 1; }
      }
    }
    st = { entries: ents, body };
    (globalThis as any).__swapStats = { swapsTried, swapsKept, passes, final: c };
  }
  if (process.env.SITE === '1') {
    // Z37 site pass: expand single key occurrences back to phrase text while the exact whole-wire count drops.
    let body = st.body; let c = countTokens(wireR(st.entries, body), enc); let sitesTried = 0, sitesExpanded = 0;
    const byKey = new Map(st.entries.map((e) => [e.key, e]));
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < body.length; i++) {
        const e = byKey.get(body[i]); if (!e) continue;
        sitesTried++;
        const cand = body.slice(0, i) + escBody(e.phrase) + body.slice(i + 1);
        const t = countTokens(wireR(st.entries, cand), enc);
        if (t < c) { body = cand; c = t; changed = true; sitesExpanded++; i += escBody(e.phrase).length - 1; }
      }
    }
    // drop entries with no remaining key sites
    let ents = st.entries.filter((e) => body.includes(e.key));
    st = { entries: ents, body };
    (globalThis as any).__siteStats = { sitesTried, sitesExpanded, dropped: st.entries.length === ents.length ? 0 : 0 };
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
