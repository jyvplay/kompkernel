/**
 * src/lib/omega/veritas-u.ts
 * =============================================================================
 * VERITAS-U — single-pass VXA dictionary over the UNION of the W in {2,3,4} candidate phrases
 * (exact, byte-perfect, decoder-verified, no window tournament).
 *
 * WHY (measured, Z31; fresh real-doc corpus of 111 npm READMEs/CHANGELOGs, bench/z31/vx-union.ts):
 *   VERITAS-A (veritas-a.ts veritasABest) runs the whole greedy dictionary three times (W = 3, 2, 4) and keeps the
 *   smallest wire. That is a tournament over encoder settings. VERITAS-U builds the candidate phrases of all three
 *   windows once, orders them in one list, and runs ONE greedy pass with the same exact whole-wire gate.
 *   Totals (o200k, 111 files): VX best-of-3 282,834; VERITAS-U 278,798 (-4,036, -1.43%). Per file: better on 72,
 *   worse on 29, equal on 10 (the gain is a total, not a per-file dominance). Encoder time 17.3 s vs 28.2 s.
 *
 * WIRE (unchanged from VERITAS-A, so the decoder and the reader contract are the VXA ones)
 *   "[[VXA\n" sentinel, "# VXA: ..." legend (VXA_LEGEND_V2), one "X=T" line per alias, "]]", then the escaped body.
 *   Input without the sentinel decodes to itself. Forced wrap: an input that starts with the sentinel is always
 *   carried by the wire (identity escape), so the prefix is unambiguous.
 *
 * GATE: a candidate phrase is kept iff the wire WITHOUT the legend (entries + body) measures fewer o200k tokens.
 *   The legend is counted once at the end. The output is the identity unless some entry is kept.
 * DECODE: veritasADecode (the VXA decoder). The encoder checks decode(encode(text)) === text and falls back to
 *   identity on a mismatch.
 * =============================================================================
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_LEGEND_V2, VXA_SENTINEL } from './veritas-a';

const K_RADIX = 200_100;
const MAX_MINE_TOKENS = 220_000;
const MAX_ANCHORS = 240;
const MAX_EXT = 32;
const MAX_POS = 8;
const POOL_SIZE = 240;
const WINDOWS = [2, 3, 4] as const;
const TERMINATOR = ']]';

export interface VeritasUEntry { key: string; phrase: string; hits: number; winTokens: number }
export interface VeritasUResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'identity' | 'dict' | 'forced-wrap';
  entries: VeritasUEntry[];
  inTokens: number;
  outTokens: number;
}

interface Cand { phrase: string; win: number; anchorHits: number }

/** Token-aligned candidate phrases for one window W, keyed by phrase (the best anchor count is kept). */
function collectCandidates(toks: { id: number; s: string }[], W: number, out: Map<string, Cand>): void {
  const T = Math.min(toks.length, MAX_MINE_TOKENS);
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
      if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); } else anchors.set(key, { c: 1, pos: [i] });
    }
  }
  const hot = [...anchors.values()].filter((a) => a.c >= 2).sort((x, y) => y.c - x.c).slice(0, MAX_ANCHORS);
  for (const a of hot) {
    const p0 = a.pos[0];
    let bestLen = W;
    for (let len = W + 1; len <= MAX_EXT && p0 + len <= T; len++) {
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

function wireOf(entries: { key: string; phrase: string }[], body: string): string {
  return VXA_SENTINEL + VXA_LEGEND_V2 + '\n' + entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + TERMINATOR + '\n' + body;
}

export type VeritasUOrder = 'old' | 'net' | 'cw';
export interface VeritasUOptions { order?: VeritasUOrder }

/** Candidate order. 'old' (default, chosen on the fresh 111-doc corpus): anchorHits*(win-2) desc, then win desc. */
function orderCands(list: Cand[], order: VeritasUOrder): void {
  if (order === 'net') list.sort((x, y) => (y.anchorHits * (y.win - 1) - (y.win + 2)) - (x.anchorHits * (x.win - 1) - (x.win + 2)) || y.win - x.win);
  else if (order === 'cw') list.sort((x, y) => y.anchorHits * y.win - x.anchorHits * x.win || y.win - x.win);
  else list.sort((x, y) => y.anchorHits * (y.win - 2) - x.anchorHits * (x.win - 2) || y.win - x.win);
}

export function veritasUEncode(text: string, enc: EncodingName = 'o200k_base', options: VeritasUOptions = {}): VeritasUResult {
  const inTokens = countTokens(text, enc);
  const identity = (): VeritasUResult => ({ wire: text, decoded: text, exact: true, mode: 'identity', entries: [], inTokens, outTokens: inTokens });
  if (text.length === 0) return identity();
  const mustWrap = text.startsWith(VXA_SENTINEL);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_SIZE);

  const toks = tokenStrings(text, enc);
  const union = new Map<string, Cand>();
  for (const W of WINDOWS) collectCandidates(toks, W, union);
  const list = [...union.values()];
  orderCands(list, options.order ?? 'old');

  let body = escBody(text);
  const entries: VeritasUEntry[] = [];
  let curTok = countTokens(body, enc);
  for (const cand of list) {
    if (entries.length >= pool.length) break;
    const key = pool[entries.length];
    const parts = body.split(escBody(cand.phrase));
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const candBody = parts.join(key);
    const candTok = countTokens(wireOf([...entries, { key, phrase: cand.phrase }], candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }

  let wire: string;
  let mode: VeritasUResult['mode'];
  if (entries.length > 0) {
    wire = wireOf(entries, body);
    mode = 'dict';
  } else if (mustWrap) {
    wire = VXA_SENTINEL + VXA_LEGEND_V2 + '\n' + TERMINATOR + '\n' + escBody(text);
    mode = 'forced-wrap';
  } else {
    return identity();
  }
  const decoded = veritasADecode(wire);
  if (decoded !== text) return identity();
  return { wire, decoded, exact: true, mode, entries, inTokens, outTokens: countTokens(wire, enc) };
}

export function veritasUDecode(wire: string): string {
  return veritasADecode(wire);
}
