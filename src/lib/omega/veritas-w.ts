import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { veritasDecode, type VeritasResult, type VeritasEntry } from './veritas';

/**
 * VERITAS-VX window-parameterised encoder (same VX1 wire format and decoder as veritas.ts).
 * W = minimum phrase length in tokens. W=3 must reproduce veritas.ts exactly (checked by the probe).
 * W=2 mines bigram anchors: a two-token phrase costs one key token per use, so it needs >=5 uses to pay.
 */
const KEY_POOL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SENTINEL = '[[VX1\n';
export const VX_LEGEND = '# VX1: ~k=T defines k; header ends at ]]; body ~k->T, ~~->~; in T ~N newline ~R CR ~~ tilde';
const TERMINATOR = ']]';
const K_RADIX = 200_100;
const MAX_MINE_TOKENS = 220_000;
const MAX_ANCHORS = 240;
const MAX_EXT = 32;
const MAX_POS = 8;

function escBody(s: string): string { return s.split('~').join('~~'); }
function escHeader(s: string): string { return s.split('~').join('~~').split('\n').join('~N').split('\r').join('~R'); }

interface Anchor { c: number; pos: number[] }

export function veritasEncodeW(text: string, enc: EncodingName, W: number, realGate = false): VeritasResult {
const inTokens = countTokens(text, enc);
const identity = (notes: string): VeritasResult => ({
wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
savingsPct: 0, entries: [], mode: 'identity', notes,
});
if (text.length === 0) return identity('empty input');

const mustWrap = text.startsWith(SENTINEL);

const toks = tokenStrings(text, enc);
const T = Math.min(toks.length, MAX_MINE_TOKENS);
const anchors = new Map<number, Anchor>();
if (T >= W) {
for (let i = 0; i + W <= T; i++) {
let key = 0; let skip = false;
for (let t = 0; t < W; t++) { const id = toks[i + t].id; if (id >= K_RADIX) { skip = true; break; } key = key * K_RADIX + id; }
if (skip) continue;
const cur = anchors.get(key);
if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); }
else anchors.set(key, { c: 1, pos: [i] });
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
for (let len = W + 1; len <= MAX_EXT && p0 + len <= T; len++) {
let share = 1;
for (let j = 1; j < a.pos.length; j++) {
const pj = a.pos[j];
if (pj + len > T || pj < p0 + len) continue;
let eq = true;
for (let t = W; t < len; t++) {
if (toks[p0 + t].id !== toks[pj + t].id) { eq = false; break; }
}
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

const aliasTokCache = new Map<string, number>();
const aliasTok = (k: string): number => {
let v = aliasTokCache.get(k);
if (v === undefined) { v = countTokens('~' + k, enc); aliasTokCache.set(k, v); }
return v;
};
cands.sort((x, y) =>
y.anchorHits * (y.win - 2) - x.anchorHits * (x.win - 2) ||
y.win - x.win
);

let body = escBody(text);
const entries: VeritasEntry[] = [];
// realGate: accept a candidate only if the full wire (sentinel, all entry lines, body) measures fewer
// real tokens than the current wire. This replaces the per-hit estimate, which is wrong when BPE merges
// across the replacement boundary (the failure mode of the estimated gate at 1-token margins).
let curTok = countTokens(body, enc);
const wireOf = (es: VeritasEntry[], b: string) => (es.length
  ? SENTINEL + es.map((e) => '~' + e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + TERMINATOR + '\n' + b
  : b);
for (const cand of cands) {
if (entries.length >= KEY_POOL.length) break;
const key = KEY_POOL[entries.length];
const phraseB = escBody(cand.phrase);
const parts = body.split(phraseB);
const hits = parts.length - 1;
if (hits < 2) continue;
const headerCost = countTokens('\n~' + key + '=' + escHeader(cand.phrase), enc);
const candBody = parts.join('~' + key);
if (realGate) {
const newEntries = [...entries, { key, phrase: cand.phrase, hits, winTokens: cand.win }];
const candTok = countTokens(wireOf(newEntries, candBody), enc);
if (candTok >= curTok) continue;
curTok = candTok;
body = candBody;
entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
continue;
}
const gain = hits * (cand.win - aliasTok(key)) - headerCost;
if (gain <= 0) continue;
body = candBody;
entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
}

let wire: string;
let mode: VeritasResult['mode'];
if (entries.length > 0) {
wire = SENTINEL
+ entries.map((e) => '~' + e.key + '=' + escHeader(e.phrase)).join('\n')
+ '\n' + TERMINATOR + '\n' + body;
mode = 'dict';
} else if (mustWrap) {
wire = SENTINEL + TERMINATOR + '\n' + escBody(text);
mode = 'forced-wrap';
} else {
return identity('no positive-gain candidates (input below redundancy floor)');
}

const decoded = veritasDecode(wire);
if (decoded !== text) {
if (mustWrap) {
wire = SENTINEL + TERMINATOR + '\n' + escBody(text);
const d2 = veritasDecode(wire);
const ot = countTokens(wire, enc);
return {
wire, decoded: d2, exact: d2 === text, inTokens, outTokens: ot,
savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
entries: [], mode: 'forced-wrap', notes: 'guard: dict wire failed verify; wrapped',
};
}
return identity('guard: wire failed byte-verify; identity emitted');
}

const outTokens = countTokens(wire, enc);
if (outTokens >= inTokens && mode === 'dict') {
if (mustWrap) {
const w2 = SENTINEL + TERMINATOR + '\n' + escBody(text);
const ot2 = countTokens(w2, enc);
return {
wire: w2, decoded: veritasDecode(w2), exact: true, inTokens, outTokens: ot2,
savingsPct: inTokens ? ((inTokens - ot2) / inTokens) * 100 : 0,
entries: [], mode: 'forced-wrap', notes: 'guard: dict not smaller; wrapped (sentinel prefix)',
};
}
return identity('guard: dictionary wire measured ≥ input; identity emitted');
}

return {
wire, decoded, exact: true, inTokens, outTokens,
savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
entries, mode,
notes: mode === 'dict'
? `${entries.length} token-space entries · verified byte-exact · guard active`
: 'forced wrap (input begins with VX1 sentinel) · verified byte-exact',
};
}


/**
 * VX-M (multi-window, real-gated). Candidate phrases come from separate anchor pools for each window
 * in `windows` (default trigrams and bigrams), each with its own cap, so bigram anchors cannot crowd
 * out trigram anchors. The union is ordered by an estimated gain and then accepted greedily, with each
 * acceptance checked by the real token count of the full wire. Same VX1 wire and decoder as veritas.ts.
 */
export function veritasEncodeMulti(text: string, enc: EncodingName, windows: number[] = [3, 2]): VeritasResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): VeritasResult => ({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, entries: [], mode: 'identity', notes,
  });
  if (text.length === 0) return identity('empty input');
  const mustWrap = text.startsWith(SENTINEL);
  const toks = tokenStrings(text, enc);
  const T = Math.min(toks.length, MAX_MINE_TOKENS);

  const seen = new Set<string>();
  const cands: { phrase: string; win: number; anchorHits: number; est: number }[] = [];
  for (const W of windows) {
    const anchors = new Map<number, Anchor>();
    if (T >= W) {
      for (let i = 0; i + W <= T; i++) {
        let key = 0; let skip = false;
        for (let t = 0; t < W; t++) { const id = toks[i + t].id; if (id >= K_RADIX) { skip = true; break; } key = key * K_RADIX + id; }
        if (skip) continue;
        const cur = anchors.get(key);
        if (cur) { cur.c++; if (cur.pos.length < MAX_POS) cur.pos.push(i); }
        else anchors.set(key, { c: 1, pos: [i] });
      }
    }
    const hot: Anchor[] = [];
    for (const a of anchors.values()) if (a.c >= 2) hot.push(a);
    hot.sort((x, y) => y.c - x.c);
    if (hot.length > MAX_ANCHORS) hot.length = MAX_ANCHORS;
    for (const a of hot) {
      const p0 = a.pos[0];
      let bestLen = W;
      for (let len = W + 1; len <= MAX_EXT && p0 + len <= T; len++) {
        let share = 1;
        for (let j = 1; j < a.pos.length; j++) {
          const pj = a.pos[j];
          if (pj + len > T || pj < p0 + len) continue;
          let eq = true;
          for (let t = W; t < len; t++) { if (toks[p0 + t].id !== toks[pj + t].id) { eq = false; break; } }
          if (eq) share++;
        }
        if (share >= 2) bestLen = len; else break;
      }
      for (const len of bestLen === W ? [W] : [bestLen, W]) {
        let phrase = '';
        for (let t = 0; t < len; t++) phrase += toks[p0 + t].s;
        if (phrase.length < 4 || seen.has(phrase)) continue;
        seen.add(phrase);
        cands.push({ phrase, win: len, anchorHits: a.c, est: a.c * (len - 1) });
      }
    }
  }
  cands.sort((x, y) => y.est - x.est || y.win - x.win);

  let body = escBody(text);
  let curTok = countTokens(body, enc);
  const entries: VeritasEntry[] = [];
  const usedPhrase = new Set<string>();
  const wireOf = (es: VeritasEntry[], b: string) => (es.length
    ? SENTINEL + es.map((e) => '~' + e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + TERMINATOR + '\n' + b
    : b);
  for (let pass = 0; pass < 2; pass++) for (const cand of cands) {
    if (entries.length >= KEY_POOL.length) break;
    if (usedPhrase.has(cand.phrase)) continue;
    const key = KEY_POOL[entries.length];
    const phraseB = escBody(cand.phrase);
    const parts = body.split(phraseB);
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const candBody = parts.join('~' + key);
    const newEntries = [...entries, { key, phrase: cand.phrase, hits, winTokens: cand.win }];
    const candTok = countTokens(wireOf(newEntries, candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    usedPhrase.add(cand.phrase);
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }

  let wire: string;
  let mode: VeritasResult['mode'];
  if (entries.length > 0) {
    wire = withVxLegend(wireOf(entries, body));
    mode = 'dict';
  } else if (mustWrap) {
    wire = SENTINEL + VX_LEGEND + '\n' + TERMINATOR + '\n' + escBody(text);
    mode = 'forced-wrap';
  } else {
    return identity('no candidate lowered the real token count (input below redundancy floor)');
  }
  const decoded = veritasDecodeL(wire);
  if (decoded !== text) {
    if (mustWrap) {
      const w2 = SENTINEL + TERMINATOR + '\n' + escBody(text);
      return { wire: w2, decoded: veritasDecodeL(w2), exact: veritasDecodeL(w2) === text, inTokens, outTokens: countTokens(w2, enc), savingsPct: 0, entries: [], mode: 'forced-wrap', notes: 'guard: wire failed verify; wrapped' };
    }
    return identity('guard: wire failed byte-verify; identity emitted');
  }
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens && mode === 'dict') return identity('guard: dictionary wire measured >= input; identity emitted');
  return {
    wire, decoded, exact: true, inTokens, outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    entries, mode,
    notes: mode === 'dict' ? `${entries.length} entries (windows ${windows.join('+')}) · real-gated · verified byte-exact` : 'forced wrap',
  };
}

/**
 * In-message decoder legend for the VX1 block. Without it the VX rules live only in a system prompt
 * (VERITAS_SYSTEM_PROMPT), which the one-chat constraint forbids. The legend is one line directly after
 * the sentinel and begins with "# ", which no dictionary line can begin with, so the decoder skips it
 * unambiguously. Wires without the legend still decode.
 */

export function withVxLegend(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  if (wire.slice(SENTINEL.length).startsWith('# ')) return wire;
  return SENTINEL + VX_LEGEND + '\n' + wire.slice(SENTINEL.length);
}

/** Decoder that accepts wires with or without the legend line. */
export function veritasDecodeL(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  let w = wire;
  const rest = wire.slice(SENTINEL.length);
  if (rest.startsWith('# ')) {
    const nl = rest.indexOf('\n');
    if (nl < 0) return wire;
    w = SENTINEL + rest.slice(nl + 1);
  }
  return veritasDecode(w);
}
