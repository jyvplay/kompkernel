/**
 * src/lib/omega/veritas-a.ts
 * =============================================================================
 * VERITAS-A — VX with one-token alias characters (exact, byte-perfect).
 *
 * WHY: a VX reference "~k" costs two tokens in the body (the tilde and the key are
 * separate tokens). A bare alias character that is a single BPE token costs one token.
 * Measured on the 21-file corpus (bench/z23/alias-cost.ts): 6,831 references, body
 * 36,759 -> 30,880 tokens with aliases, -5,879 tokens (-16%).
 *
 * WIRE
 *   [[VXA                                  sentinel line (text starts with "[[VXA\n")
 *   # VXA: ...                             legend line (in-message)
 *   X=T                                    one entry per line: X is one alias character
 *   ]]                                     header terminator
 *   body                                   escaped text; a bare X expands to T
 *   Escapes:  header T: ~~ -> ~, ~N -> newline, ~R -> CR
 *             body:     ~~ -> ~
 *   Alias characters are chosen so they do NOT occur in the input text (so a bare alias
 *   never collides with literal text). They are single o200k tokens, BMP, non-ASCII.
 *   Input without the sentinel decodes to itself.
 * =============================================================================
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';

export const VXA_SENTINEL = '[[VXA\n';
export const VXA_LEGEND = '# VXA: X=T defines alias X; bare X in body or T stands for T; ~~ = ~; in T ~N = newline, ~R = CR; header ends at ]]';
/** Shorter legend (28 o200k tokens vs 40); states the same rules. Decoder ignores any "# " legend line. */
export const VXA_LEGEND_V2 = '# VXA: X=T, bare X means T; ~~ is ~; in T ~N newline ~R CR; header ends ]]';
const TERMINATOR = ']]';
const K_RADIX = 200_100;
const MAX_MINE_TOKENS = 220_000;
const MAX_ANCHORS = 240;
const MAX_EXT = 32;
const MAX_POS = 8;
const POOL_SIZE = 240;

export const poolCache = new Map<EncodingName, string[]>();
/** Single-token BMP non-ASCII characters, in codepoint order. The alias pool is this minus the input's characters. */
export function aliasPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let c = 0xa1; c < 0x3000 && out.length < POOL_SIZE + 200; c++) {
    if (c >= 0xd800 && c <= 0xdfff) continue;
    const ch = String.fromCharCode(c);
    if (/\s/.test(ch) || ch === '~' || ch === '[' || ch === ']' || ch === '#' || ch === '=') continue;
    if (countTokens(ch, enc) === 1) out.push(ch);
  }
  poolCache.set(enc, out);
  return out;
}

export function escBody(s: string): string { return s.split('~').join('~~'); }
export function escHeader(s: string): string {
  return s.split('~').join('~~').split('\n').join('~N').split('\r').join('~R');
}

export interface VxaEntry { key: string; phrase: string; hits: number; winTokens: number }
export interface VxaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'dict' | 'forced-wrap' | 'identity';
  entries: VxaEntry[];
  inTokens: number;
  outTokens: number;
}

interface Anchor { c: number; pos: number[] }

function wireOf(entries: VxaEntry[], body: string, legend: string): string {
  if (entries.length === 0) return body;
  const lines = entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n');
  return VXA_SENTINEL + (legend ? legend + '\n' : '') + lines + '\n' + TERMINATOR + '\n' + body;
}

export function veritasAEncode(text: string, enc: EncodingName, W = 3, legend: string = VXA_LEGEND, maxExt: number = MAX_EXT): VxaResult {
  const inTokens = countTokens(text, enc);
  const identity = (): VxaResult => ({
    wire: text, decoded: text, exact: true, mode: 'identity', entries: [], inTokens, outTokens: inTokens,
  });
  if (text.length === 0) return identity();
  const mustWrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL) || text.startsWith(VXS_SENTINEL) || text.startsWith(VXR_SENTINEL);
  const pool = aliasPool(enc).filter((c) => !text.includes(c));
  const keys = pool.slice(0, POOL_SIZE);

  const toks = tokenStrings(text, enc);
  const T = Math.min(toks.length, MAX_MINE_TOKENS);
  const anchors = new Map<number, Anchor>();
  if (T >= W) {
    for (let i = 0; i + W <= T; i++) {
      let key = 0; let skip = false;
      for (let t = 0; t < W; t++) { const id = toks[i + t].id; if (id >= K_RADIX) { skip = true; break; } key = key * K_RADIX + id; }
      if (skip) continue;
      const cur = anchors.get(key);
      if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); } else anchors.set(key, { c: 1, pos: [i] });
    }
  }
  const hot: Anchor[] = [];
  for (const a of anchors.values()) if (a.c >= 2) hot.push(a);
  hot.sort((x, y) => y.c - x.c);
  if (hot.length > MAX_ANCHORS) hot.length = MAX_ANCHORS;

  interface Cand { phrase: string; win: number; anchorHits: number }
  const seen = new Set<string>();
  const cands: Cand[] = [];
  for (const a of hot) {
    const p0 = a.pos[0];
    let bestLen = W;
    for (let len = W + 1; len <= maxExt && p0 + len <= T; len++) {
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
      if (phrase.length < 4 || seen.has(phrase)) continue;
      seen.add(phrase);
      cands.push({ phrase, win: len, anchorHits: a.c });
    }
  }
  cands.sort((x, y) => y.anchorHits * (y.win - 2) - x.anchorHits * (x.win - 2) || y.win - x.win);

  // Greedy with the real gate: a candidate is kept iff the wire WITHOUT legend (sentinel, entries, body)
  // measures fewer real tokens. The legend is added once at the end (its fixed cost would otherwise block
  // every first candidate).
  let body = escBody(text);
  const entries: VxaEntry[] = [];
  let curTok = countTokens(body, enc);
  for (const cand of cands) {
    if (entries.length >= keys.length) break;
    const key = keys[entries.length];
    const phraseB = escBody(cand.phrase);
    const parts = body.split(phraseB);
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const candBody = parts.join(key);
    const newEntries = [...entries, { key, phrase: cand.phrase, hits, winTokens: cand.win }];
    const candTok = countTokens(wireOf(newEntries, candBody, ''), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }

  let wire: string;
  let mode: VxaResult['mode'];
  if (entries.length > 0) {
    wire = VXA_SENTINEL + legend + '\n' + entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + TERMINATOR + '\n' + body;
    mode = 'dict';
  } else if (mustWrap) {
    wire = VXA_SENTINEL + legend + '\n' + TERMINATOR + '\n' + escBody(text);
    mode = 'forced-wrap';
  } else {
    return identity();
  }
  const decoded = veritasADecode(wire);
  if (decoded !== text) {
    return identity();
  }
  return { wire, decoded, exact: true, mode, entries, inTokens, outTokens: countTokens(wire, enc) };
}

/** Undo VERITAS-A. Input without the sentinel is returned verbatim. */
/** VXN: same wire as VXA, but a header phrase may use the alias characters of SHORTER entries (a nested header).
 *  Decoding flattens the header into an ordinary VXA wire (every alias expanded), then runs the VXA decoder. */
export const VXN_SENTINEL = '[[VXN\n';
/** VXC: nested header with an equals-free line format ("X" then the escaped phrase). Same body and decoder path. */
export const VXC_SENTINEL = '[[VXC\n';
/** VXS: the VXC wire under its own sentinel (VERITAS-S encoder). Same header and body; decoded by the VXC path. */
export const VXS_SENTINEL = '[[VXS\n';
/** VXR: the VXC wire under its own sentinel (VERITAS-R encoder, Z34). Same header and body; decoded by the VXC path. */
export const VXR_SENTINEL = '[[VXR\n';
const VXA_NEST_MAX_DEPTH = 64;

export function flattenNestedHeader(wire: string): string {
  const eqFree = wire.startsWith(VXC_SENTINEL) || wire.startsWith(VXS_SENTINEL) || wire.startsWith(VXR_SENTINEL);
  if (!eqFree && !wire.startsWith(VXN_SENTINEL)) return wire;
  const pre = !eqFree ? VXN_SENTINEL : wire.startsWith(VXS_SENTINEL) ? VXS_SENTINEL : wire.startsWith(VXR_SENTINEL) ? VXR_SENTINEL : VXC_SENTINEL;
  const lines = wire.slice(pre.length).split('\n');
  let i = 0;
  if (i < lines.length && lines[i].startsWith('# ')) i++;
  const raw = new Map<string, string>();
  const keys: string[] = [];
  while (i < lines.length && lines[i] !== TERMINATOR) {
    const ln = lines[i];
    if (eqFree ? ln.length < 2 : (ln.length < 2 || ln[1] !== '=')) throw new Error('VXN: bad entry line');
    const phrase: string[] = [];
    const p = eqFree ? ln.slice(1) : ln.slice(2);
    for (let j = 0; j < p.length; ) {
      const c = p[j];
      if (c !== '~') { phrase.push(c); j++; continue; }
      const n = p[j + 1];
      if (n === '~') phrase.push('~');
      else if (n === 'N') phrase.push('\n');
      else if (n === 'R') phrase.push('\r');
      else throw new Error('VXN: bad header escape');
      j += 2;
    }
    if (raw.has(ln[0])) throw new Error('VXN: duplicate key');
    raw.set(ln[0], phrase.join(''));
    keys.push(ln[0]);
    i++;
  }
  if (i >= lines.length) throw new Error('VXN: missing terminator');
  const full = new Map<string, string>();
  const expand = (k: string, depth: number): string => {
    const hit = full.get(k);
    if (hit !== undefined) return hit;
    if (depth > VXA_NEST_MAX_DEPTH) throw new Error('VXN: alias cycle');
    const src = raw.get(k)!;
    let out = '';
    for (const c of src) out += raw.has(c) ? expand(c, depth + 1) : c;
    full.set(k, out);
    return out;
  };
  for (const k of keys) expand(k, 0);
  const body = lines.slice(i + 1).join('\n');
  const flatLines = keys.map((k) => k + '=' + escHeader(full.get(k)!));
  const head = flatLines.length ? flatLines.join('\n') + '\n' : '';
  return VXA_SENTINEL + VXA_LEGEND_V2 + '\n' + head + TERMINATOR + '\n' + body;
}

export function veritasADecode(wire: string): string {
  if (wire.startsWith(VXN_SENTINEL) || wire.startsWith(VXC_SENTINEL) || wire.startsWith(VXS_SENTINEL) || wire.startsWith(VXR_SENTINEL)) return veritasADecode(flattenNestedHeader(wire));
  if (!wire.startsWith(VXA_SENTINEL)) return wire;
  const lines = wire.slice(VXA_SENTINEL.length).split('\n');
  let i = 0;
  if (i < lines.length && lines[i].startsWith('# ')) i++;
  const map = new Map<string, string>();
  while (i < lines.length && lines[i] !== TERMINATOR) {
    const ln = lines[i];
    if (ln.length < 2 || ln[1] !== '=') throw new Error('VXA: bad entry line');
    const phrase: string[] = [];
    const p = ln.slice(2);
    for (let j = 0; j < p.length; ) {
      const c = p[j];
      if (c !== '~') { phrase.push(c); j++; continue; }
      const n = p[j + 1];
      if (n === '~') phrase.push('~');
      else if (n === 'N') phrase.push('\n');
      else if (n === 'R') phrase.push('\r');
      else throw new Error('VXA: bad header escape');
      j += 2;
    }
    map.set(ln[0], phrase.join(''));
    i++;
  }
  if (i >= lines.length) throw new Error('VXA: missing terminator');
  const body = lines.slice(i + 1).join('\n');
  const out: string[] = [];
  for (let j = 0; j < body.length; ) {
    const c = body[j];
    if (c === '~') {
      if (body[j + 1] !== '~') throw new Error('VXA: bad body escape');
      out.push('~'); j += 2; continue;
    }
    const v = map.get(c);
    if (v !== undefined) out.push(v); else out.push(c);
    j++;
  }
  return out.join('');
}

/**
 * Encoder-side choice only: the minimum-token VXA wire over window W in {3, 2, 4} (ties -> earlier W).
 * The wire format is identical for every W, so the decoder is unchanged and no flag is needed.
 */
export function veritasABest(text: string, enc: EncodingName, legend: string = VXA_LEGEND_V2): VxaResult {
  let best: VxaResult | null = null;
  for (const W of [3, 2, 4]) {
    const r = veritasAEncode(text, enc, W, legend);
    if (best === null || r.outTokens < best.outTokens) best = r;
  }
  return best as VxaResult;
}
