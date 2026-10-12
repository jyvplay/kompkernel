/**
 * VERITAS-S (Z33): VERITAS-C wire under the VXS sentinel, with a different greedy search.
 *
 * Wire: `[[VXS` line, legend line, header lines `X<escaped T>` (nested: a header phrase may use
 * earlier keys), `]]`, body. The decoder is the existing VXC path (veritasADecode), so no new reader is needed.
 *
 * Encoder (a search, not a proof of optimality): each step builds one candidate pool from
 *   - token-window phrases (windows 2..4 tokens, anchor cap 240, position cap 64, extension cap 32),
 *   - character substrings of length 4..80 (charCandidates from VERITAS-C),
 *   - non-aligned strings of length 1..3 that occur at least 4 times (top 300 by frequency),
 * ranks them, and exactly re-counts the wire tokens for each candidate in rank order. The scan stops after
 * K_IMPROVE improving candidates or MAX_TRIALS trials. The best improving candidate is applied. Repeat until no
 * candidate improves or the key pool is exhausted. The encoder decodes its own wire and falls back to the
 * input verbatim if the check fails and no wrapper is needed.
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXC_SENTINEL, VXN_SENTINEL, VXS_SENTINEL } from './veritas-a';
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
const K_IMPROVE = 10;
const MAX_TRIALS = 300;

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

export function veritasSEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasSResult {
  const inTokens = countTokens(text, enc);
  const finish = (wire: string, entries: number, trials: number): VeritasSResult => {
    const decoded = veritasADecode(wire);
    const exact = decoded === text;
    return { wire, decoded, exact, entries, inTokens, outTokens: countTokens(wire, enc), trials };
  };
  if (text.length === 0) return finish(text, 0, 0);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_MAX);
  let body = escBody(text);
  const entries: VeritasSEntry[] = [];
  let cur = countTokens(body, enc);
  let trialsTot = 0;
  const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
  while (entries.length < pool.length) {
    const toks = tokenStrings(body, enc);
    const tm = new Map<string, Cand>();
    for (const W of WINDOWS) collectWindowCands(toks, W, tm);
    const list = [...tm.values(), ...charCandidates(body, enc), ...shortCands(body)];
    const seen = new Set<string>();
    const ranked = list
      .filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
      .filter((c) => c.anchorHits >= 2)
      .sort((x, y) => score(y) - score(x));
    const key = pool[entries.length];
    const improving: { phrase: string; body: string; t: number }[] = [];
    let trials = 0;
    for (const c of ranked) {
      if (improving.length >= K_IMPROVE || trials >= MAX_TRIALS) break;
      const esc = escBody(c.phrase);
      const parts = body.split(esc);
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
  if (entries.length === 0) {
    // Nothing helped. Return the input verbatim unless it starts with a sentinel (then it must be wrapped).
    const wrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL) || text.startsWith(VXS_SENTINEL);
    return finish(wrap ? wireS([], escBody(text)) : text, 0, trialsTot);
  }
  return finish(wireS(entries, body), entries.length, trialsTot);
}

/** Decode a VXS wire (or any wire VERITAS-A accepts). */
export function veritasSDecode(wire: string): string {
  return veritasADecode(wire);
}
