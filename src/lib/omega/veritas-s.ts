/**
 * VERITAS-S (Z33, gate fixed in Z34): VERITAS-C wire under the VXS sentinel, with a different greedy search.
 *
 * Wire: `[[VXS` line, legend line, header lines `X<escaped T>` (nested: a header phrase may use
 * earlier keys), `]]`, body. The decoder is the existing VXC path (veritasADecode), so no new reader is needed.
 *
 * Encoder (a search, not a proof of optimality):
 *   1. Greedy. Each step builds one candidate pool from
 *        - token-window phrases (windows 2..4 tokens, anchor cap 240, position cap 64, extension cap 32),
 *        - character substrings of length 4..80 (charCandidates from VERITAS-C),
 *        - non-aligned strings of length 1..3 that occur at least 4 times (top 300 by frequency),
 *      ranks them, and exactly re-counts the full wire (legend included) for each candidate in rank order.
 *      The scan stops after K_IMPROVE improving candidates or MAX_TRIALS trials. The best improving candidate is applied.
 *   2. Refinement (key reassignment). Each entry may move to another unused pool key when that lowers the exact count.
 *      Pruning (removing an entry) is also tried. Repeat until no move improves.
 *   3. Final gate. The wire is emitted only if it is smaller than the raw input (exact one-chat tokens). Otherwise the input is emitted verbatim.
 * The encoder decodes its own output and reports exactness.
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXC_SENTINEL, VXN_SENTINEL, VXR_SENTINEL, VXS_SENTINEL } from './veritas-a';
import { TERMINATOR, type Cand } from './veritas-u';
import { charCandidates } from './veritas-c';
import { nestedHeaderPhrases } from './veritas-n';

export const VXS_LEGEND = '# VXS: header lines "XT": bare X means T (T may hold other X); ~~ ~, ~N newline, ~R CR; ]] ends';

const POOL_MAX = 240;
const WINDOWS = [2, 3, 4];
const ANCHOR_CAP = 240;
const POS_CAP = 64;
const EXT_CAP = 32;
const MINE_CAP = 220000;
const K_RADIX = 200100;
const SHORT_N = 300;
const SHORT_MIN_COUNT = 4;

export interface SearchOptions { kImprove?: number; maxTrials?: number; refine?: boolean }
const DEFAULTS: Required<SearchOptions> = { kImprove: 10, maxTrials: 300, refine: true };

export interface VeritasSEntry { key: string; phrase: string }
export interface VeritasSResult {
  wire: string;
  decoded: string;
  exact: boolean;
  entries: number;
  inTokens: number;
  outTokens: number;
  trials: number;
}
export interface SearchState { entries: VeritasSEntry[]; body: string; trials: number; refineMoves: { prunes: number; rekeys: number } }

/** VXS wire for a given entry list and body (body already escaped by escBody). */
export function wireS(entries: VeritasSEntry[], body: string): string {
  const nh = nestedHeaderPhrases(entries);
  const head = entries.length ? entries.map((e) => e.key + escHeader(nh.get(e.key)!)).join('\n') + '\n' : '';
  return VXS_SENTINEL + VXS_LEGEND + '\n' + head + TERMINATOR + '\n' + body;
}

/** Token-window candidates: a copy of VERITAS-U collectCandidates with the caps above as parameters. */
function collectWindowCands(toks: { id: number; s: string }[], W: number, out: Map<string, Cand>): void {
  const T = Math.min(toks.length, MINE_CAP);
  const anchors = new Map<number, { c: number; pos: number[] }>();
  if (T >= W) {
    for (let i = 0; i + W <= T; i++) {
      let key = 0;
      let skip = false;
      for (let t = 0; t < W; t++) {
        const id = toks[i + t].id;
        if (id >= K_RADIX) { skip = true; break; }
        key = key * K_RADIX + id;
      }
      if (skip) continue;
      const cur = anchors.get(key);
      if (cur) { cur.c++; if (cur.pos.length < POS_CAP) cur.pos.push(i); } else anchors.set(key, { c: 1, pos: [i] });
    }
  }
  const hot = [...anchors.values()].filter((a) => a.c >= 2).sort((x, y) => y.c - x.c).slice(0, ANCHOR_CAP);
  for (const a of hot) {
    const p0 = a.pos[0];
    let bestLen = W;
    for (let len = W + 1; len <= EXT_CAP && p0 + len <= T; len++) {
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

/** Non-aligned short strings (length 1..3, no '~' and no newline) that occur at least SHORT_MIN_COUNT times. */
function shortCands(body: string): Cand[] {
  const cnt = new Map<string, number>();
  for (let L = 1; L <= 3; L++) {
    for (let i = 0; i + L <= body.length; i++) {
      const s = body.slice(i, i + L);
      if (s.includes('~') || s.includes('\n')) continue;
      cnt.set(s, (cnt.get(s) ?? 0) + 1);
    }
  }
  return [...cnt.entries()]
    .filter(([, c]) => c >= SHORT_MIN_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, SHORT_N)
    .map(([phrase, c]) => ({ phrase, win: 1, anchorHits: c }));
}

/** Ranked candidate phrases for one greedy step (the search and the diagnostics share this). */
export function rankedCandidatesS(body: string, enc: EncodingName = 'o200k_base'): Cand[] {
  const toks = tokenStrings(body, enc);
  const tm = new Map<string, Cand>();
  for (const W of WINDOWS) collectWindowCands(toks, W, tm);
  const list = [...tm.values(), ...charCandidates(body, enc), ...shortCands(body)];
  const seen = new Set<string>();
  const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
  return list
    .filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
    .filter((c) => c.anchorHits >= 2)
    .sort((x, y) => score(y) - score(x));
}

/** Remove entry i: its key is replaced by its phrase everywhere it occurs (body and later phrases). */
export function removeEntryS(st: { entries: VeritasSEntry[]; body: string }, i: number): { entries: VeritasSEntry[]; body: string } {
  const K = st.entries[i].key, P = st.entries[i].phrase;
  const entries = st.entries.filter((_, j) => j !== i).map((e, j) => (j >= i ? { key: e.key, phrase: e.phrase.split(K).join(P) } : e));
  return { entries, body: st.body.split(K).join(escBody(P)) };
}

/** Reassign entry i to key nk: rename its key in the body and in every later phrase. */
export function rekeyEntryS(st: { entries: VeritasSEntry[]; body: string }, i: number, nk: string): { entries: VeritasSEntry[]; body: string } {
  const K = st.entries[i].key;
  const entries = st.entries.map((e, j) => (j === i ? { key: nk, phrase: e.phrase } : j > i ? { key: e.key, phrase: e.phrase.split(K).join(nk) } : e));
  return { entries, body: st.body.split(K).join(nk) };
}

/** Local refinement: prune entries and reassign keys while the exact wire count improves. */
export function refineS(text: string, st0: { entries: VeritasSEntry[]; body: string }, enc: EncodingName = 'o200k_base'): { entries: VeritasSEntry[]; body: string; prunes: number; rekeys: number } {
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_MAX);
  const cost = (s: { entries: VeritasSEntry[]; body: string }) => countTokens(wireS(s.entries, s.body), enc);
  let st = st0, cur = cost(st), prunes = 0, rekeys = 0, improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < st.entries.length; i++) {
      const c = removeEntryS(st, i); const t = cost(c);
      if (t < cur) { st = c; cur = t; prunes++; improved = true; i--; }
    }
    for (let i = 0; i < st.entries.length && !improved; i++) {
      const used = new Set(st.entries.map((e) => e.key));
      for (const k of pool) {
        if (used.has(k)) continue;
        const c = rekeyEntryS(st, i, k); const t = cost(c);
        if (t < cur) { st = c; cur = t; rekeys++; improved = true; break; }
      }
    }
  }
  return { entries: st.entries, body: st.body, prunes, rekeys };
}

/** Greedy search (plus refinement unless disabled). Returns entries in application order and the escaped body. */
export function searchS(text: string, enc: EncodingName = 'o200k_base', options: SearchOptions = {}): SearchState {
  const o = { ...DEFAULTS, ...options };
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_MAX);
  let body = escBody(text);
  const entries: VeritasSEntry[] = [];
  // Baseline counts the same wire as the trials (legend included). A bare-body baseline gave a false +33 gate.
  let cur = countTokens(wireS([], body), enc);
  let trialsTot = 0;
  while (entries.length < pool.length) {
    const ranked = rankedCandidatesS(body, enc);
    const key = pool[entries.length];
    const improving: { phrase: string; body: string; t: number }[] = [];
    let trials = 0;
    for (const c of ranked) {
      if (improving.length >= o.kImprove || trials >= o.maxTrials) break;
      const parts = body.split(escBody(c.phrase));
      if (parts.length - 1 < 2) continue;
      trials++;
      const cb = parts.join(key);
      const t = countTokens(wireS([...entries, { key, phrase: c.phrase }], cb), enc);
      if (t < cur) improving.push({ phrase: c.phrase, body: cb, t });
    }
    trialsTot += trials;
    if (improving.length === 0) break;
    const best = improving.reduce((a, b) => (b.t < a.t ? b : a));
    cur = best.t;
    body = best.body;
    entries.push({ key, phrase: best.phrase });
  }
  if (!o.refine || entries.length === 0) return { entries, body, trials: trialsTot, refineMoves: { prunes: 0, rekeys: 0 } };
  const r = refineS(text, { entries, body }, enc);
  return { entries: r.entries, body: r.body, trials: trialsTot, refineMoves: { prunes: r.prunes, rekeys: r.rekeys } };
}

export function veritasSEncode(text: string, enc: EncodingName = 'o200k_base', options: SearchOptions = {}): VeritasSResult {
  const inTokens = countTokens(text, enc);
  const finish = (wire: string, entries: number, trials: number): VeritasSResult => {
    const decoded = veritasADecode(wire);
    const exact = decoded === text;
    return { wire, decoded, exact, entries, inTokens, outTokens: countTokens(wire, enc), trials };
  };
  if (text.length === 0) return finish(text, 0, 0);
  const st = searchS(text, enc, options);
  const wrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL) || text.startsWith(VXS_SENTINEL) || text.startsWith(VXR_SENTINEL);
  if (st.entries.length === 0) {
    // Nothing helped. Return the input verbatim unless it starts with a sentinel (then it must be wrapped).
    return finish(wrap ? wireS([], escBody(text)) : text, 0, st.trials);
  }
  const wire = wireS(st.entries, st.body);
  // Final gate: the wire must beat the raw input (legend and header included); otherwise emit the input verbatim.
  if (countTokens(wire, enc) >= inTokens) return finish(wrap ? wireS([], escBody(text)) : text, 0, st.trials);
  return finish(wire, st.entries.length, st.trials);
}

/** Decode a VXS wire (or any wire VERITAS-A accepts). */
export function veritasSDecode(wire: string): string {
  return veritasADecode(wire);
}
