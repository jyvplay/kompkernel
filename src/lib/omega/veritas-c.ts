/**
 * src/lib/omega/veritas-c.ts
 * =============================================================================
 * VERITAS-C — VERITAS-N with CHARACTER-LEVEL candidates and an EQUALS-FREE header (exact, byte-perfect,
 * decoder-verified, one greedy pass, identity-guarded).
 *
 * THREE MECHANISMS, EACH MEASURED SEPARATELY IN Z32 (bench/z32/*.receipt.txt):
 *   1. Nested header (VERITAS-N): a header phrase may refer to the alias of a shorter entry. Probe: -1.87% wire.
 *   2. Equals-free header: the line is "X" followed by the escaped phrase (no "="). Probe: -1.55% wire, consistent
 *      across lanes (-1.1% to -1.9%). The alias is always one character, so the line needs no separator.
 *   3. Character-level candidates: VERITAS-U only proposes WHOLE-TOKEN windows (2 to 4 o200k tokens, extended). A
 *      substring that starts or ends inside a token (a word tail such as "ment", a path fragment, a tail of a
 *      number) is invisible to it. VERITAS-C also proposes character substrings of length 4 to 80 that occur at
 *      least twice. The real-token gate keeps a candidate only if the whole wire measures fewer tokens.
 *
 * WIRE
 *   "[[VXC\n" sentinel, "# VXC: ..." legend, one line per alias "X<escaped phrase>", "]]", then the escaped body.
 *   A phrase may use the alias of a SHORTER entry (nested). The body uses bare aliases. Input without the sentinel
 *   decodes to itself. Inputs that begin with any dictionary sentinel are carried by a forced wrap.
 *
 * SELECTION: one greedy pass over (token-window candidates of VERITAS-U) and (character candidates), in the order
 *   given by the candidate score. Every candidate is scored by the NESTED, equals-free wire (exact o200k count).
 * DECODE: veritasADecode (VXC is flattened to a VXA wire, then the VXA decoder runs). The encoder decodes its own
 *   output and falls back to identity on any mismatch.
 * =============================================================================
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXN_SENTINEL, VXC_SENTINEL } from './veritas-a';
import { collectCandidates, orderCands, TERMINATOR, type Cand } from './veritas-u';
import { nestedHeaderPhrases } from './veritas-n';

export const VXC_LEGEND = '# VXC: header lines "XT": bare X means T (T may hold other X); ~~ ~, ~N newline, ~R CR; ]] ends';  // 33 o200k tokens
const WINDOWS = [2, 3, 4] as const;
const POOL_SIZE = 240;
const CHAR_MIN = 4;
const CHAR_MAX = 80;
const CHAR_CANDS_MAX = 3000;
const CHAR_TEXT_MAX = 60_000;
// Candidate order is fixed: token-window candidates in VERITAS-U order, then character candidates. A single merged
// score order was measured worse (+2.00% vs VERITAS-N on the fresh corpus, bench/z32/vxc-eval.receipt.txt).

export interface VeritasCEntry { key: string; phrase: string; hits: number; winTokens: number }
export interface VeritasCResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'identity' | 'dict' | 'forced-wrap';
  entries: VeritasCEntry[];
  inTokens: number;
  outTokens: number;
}

export function wireC(entries: { key: string; phrase: string }[], body: string): string {
  const nh = nestedHeaderPhrases(entries);
  const head = entries.length ? entries.map((e) => e.key + escHeader(nh.get(e.key)!)).join('\n') + '\n' : '';
  return VXC_SENTINEL + VXC_LEGEND + '\n' + head + TERMINATOR + '\n' + body;
}

/**
 * Character-substring candidates: every substring of length CHAR_MIN..CHAR_MAX that occurs at least twice.
 * Occurrence counting uses a rolling 32-bit hash per length (O(N) per length, no string table). A hash collision
 * can only add a useless candidate: each candidate is a real substring of the text, and the greedy pass counts its
 * occurrences on the current body by exact string split. The best CHAR_CANDS_MAX by an estimated saving
 * (hits * (tokens - 1) - (tokens + 1), tokens from a character-length estimate, then exact isolated count) are kept.
 */
export function charCandidates(text: string, enc: EncodingName): Cand[] {
  const N = text.length;
  if (N > CHAR_TEXT_MAX || N < CHAR_MIN * 2) return [];
  const codes = new Uint32Array(N);
  for (let i = 0; i < N; i++) codes[i] = text.charCodeAt(i);
  const B = 0x01000193;
  const H = new Uint32Array(N);
  const pre: { L: number; pos: number; hits: number; est: number }[] = [];
  for (let L = 1; L <= CHAR_MAX; L++) {
    const cnt = new Map<number, { hits: number; pos: number }>();
    for (let i = 0; i + L <= N; i++) {
      H[i] = (Math.imul(H[i], B) ^ codes[i + L - 1]) >>> 0;
      if (L < CHAR_MIN) continue;
      const hit = cnt.get(H[i]);
      if (hit) hit.hits++; else cnt.set(H[i], { hits: 1, pos: i });
    }
    if (L < CHAR_MIN) continue;
    for (const { hits, pos } of cnt.values()) {
      if (hits < 2) continue;
      const est = Math.max(1, Math.round(L / 3.5));
      const gain = hits * (est - 1) - (est + 1);
      if (gain > 0) pre.push({ L, pos, hits, est: gain });
    }
  }
  pre.sort((a, b) => b.est - a.est);
  const top = pre.slice(0, CHAR_CANDS_MAX * 3);
  const scored: Cand[] = [];
  const seen = new Set<string>();
  for (const c of top) {
    const phrase = text.slice(c.pos, c.pos + c.L);
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    const tok = countTokens(phrase, enc);
    const gain = c.hits * (tok - 1) - (tok + 1);
    if (gain > 0) scored.push({ phrase, win: tok, anchorHits: c.hits });
  }
  scored.sort((x, y) => (y.anchorHits * (y.win - 1) - (y.win + 1)) - (x.anchorHits * (x.win - 1) - (x.win + 1)));
  return scored.slice(0, CHAR_CANDS_MAX);
}

// Search width of the best-improvement pass (candidates trial-encoded per step).
const BEST_WIDTH = 20;

interface Greedy { entries: VeritasCEntry[]; body: string }

// Pass 1 (first-improvement): walk the ordered candidates once, accept each that lowers the exact wire.
function greedyFirst(text: string, enc: EncodingName, pool: string[], list: Cand[]): Greedy {
  let body = escBody(text);
  const entries: VeritasCEntry[] = [];
  let curTok = countTokens(body, enc);
  for (const cand of list) {
    if (entries.length >= pool.length) break;
    const key = pool[entries.length];
    const parts = body.split(escBody(cand.phrase));
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const candBody = parts.join(key);
    const candTok = countTokens(wireC([...entries, { key, phrase: cand.phrase }], candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }
  return { entries, body };
}

// Pass 2 (best-improvement): each step re-derives candidates from the current body, trial-encodes the
// top BEST_WIDTH by estimated saving, and keeps the trial with the fewest exact wire tokens.
function greedyBest(text: string, enc: EncodingName, pool: string[]): Greedy {
  let body = escBody(text);
  const entries: VeritasCEntry[] = [];
  let curTok = countTokens(body, enc);
  while (entries.length < pool.length) {
    const toks = tokenStrings(body, enc);
    const tokMap = new Map<string, Cand>();
    for (const W of WINDOWS) collectCandidates(toks, W, tokMap);
    const merged = [...tokMap.values(), ...charCandidates(body, enc)];
    const seen = new Set<string>();
    const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
    const top = merged
      .filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
      .filter((c) => c.anchorHits >= 2)
      .sort((x, y) => score(y) - score(x))
      .slice(0, BEST_WIDTH);
    const key = pool[entries.length];
    let best: { phrase: string; body: string; tok: number; hits: number; win: number } | null = null;
    for (const c of top) {
      const parts = body.split(escBody(c.phrase));
      const hits = parts.length - 1;
      if (hits < 2) continue;
      const candBody = parts.join(key);
      const t = countTokens(wireC([...entries, { key, phrase: c.phrase }], candBody), enc);
      if (t < curTok && (!best || t < best.tok)) best = { phrase: c.phrase, body: candBody, tok: t, hits, win: c.win };
    }
    if (!best) break;
    curTok = best.tok;
    body = best.body;
    entries.push({ key, phrase: best.phrase, hits: best.hits, winTokens: best.win });
  }
  return { entries, body };
}

export function veritasCEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasCResult {
  const inTokens = countTokens(text, enc);
  const identity = (): VeritasCResult => ({ wire: text, decoded: text, exact: true, mode: 'identity', entries: [], inTokens, outTokens: inTokens });
  if (text.length === 0) return identity();
  const mustWrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_SIZE);

  const toks = tokenStrings(text, enc);
  const tokMap = new Map<string, Cand>();
  for (const W of WINDOWS) collectCandidates(toks, W, tokMap);
  const tokList = [...tokMap.values()];
  orderCands(tokList, 'old');
  const chrList = charCandidates(text, enc);
  const seen = new Set<string>();
  const list = [...tokList, ...chrList].filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)));

  // Keep the shorter exact wire of the two passes (both produce the same wire format).
  const passes = [greedyFirst(text, enc, pool, list), greedyBest(text, enc, pool)];
  let best: { wire: string; entries: VeritasCEntry[]; tok: number } | null = null;
  for (const g of passes) {
    if (g.entries.length === 0) continue;
    const wire = wireC(g.entries, g.body);
    const tok = countTokens(wire, enc);
    if (!best || tok < best.tok) best = { wire, entries: g.entries, tok };
  }

  let wire: string;
  let mode: VeritasCResult['mode'];
  let entries: VeritasCEntry[] = [];
  if (best) {
    wire = best.wire;
    entries = best.entries;
    mode = 'dict';
  } else if (mustWrap) {
    wire = wireC([], escBody(text));
    mode = 'forced-wrap';
  } else {
    return identity();
  }
  const decoded = veritasADecode(wire);
  if (decoded !== text) return identity();
  return { wire, decoded, exact: true, mode, entries, inTokens, outTokens: countTokens(wire, enc) };
}

export function veritasCDecode(wire: string): string {
  return veritasADecode(wire);
}
