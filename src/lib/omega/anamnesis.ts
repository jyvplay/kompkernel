import { now } from './clock';
/**
 * ANAMNESIS — ἀνάμνησις, "recollection".
 * =============================================================================
 *
 * THE MECHANISM THIS REPO HAS NOT HAD
 * -----------------------------------------------------------------------------
 * Every registered codec here is a function of ONE message: E : Σ* → Σ*.  The
 * dictionary is rebuilt from scratch inside that message, paid for inside that
 * message, and thrown away when the message ends.  Two modules came close and
 * neither is a codec in this sense:
 *
 *   - `persistent-dict.ts` keeps a cross-turn dictionary in **localStorage**.
 *     A chat reader cannot see localStorage, so the mapping never reaches the
 *     decoder.  Inadmissible under the one-chat constraint.
 *   - `ctxcopy.ts` copies by anchors from earlier chat text, but it is not
 *     registered, has **no cost gate** (measured: it makes a message 0.4%
 *     *larger* on `bench/z44/receipts/session-prize.log`, session `repo-review`
 *     m3), is untuned (`minCopy` 60 characters), and carries no dictionary.
 *
 * ANAMNESIS makes the **chat transcript itself the dictionary**.  A rule letter
 * defined in message 1 is still in force in message 7, so a phrase that recurs
 * across turns is paid for once.  Long spans that occur only once in this
 * message but occurred earlier in the chat become anchored copies instead of
 * literals.  The decoder contract is transmitted once, in the first message —
 * which is the access model the task statement explicitly admits ("the system
 * instruction prompt inline with the first message of that chat").
 *
 * WHAT IS MEASURED, NOT ASSERTED (receipts in bench/z44/receipts/)
 * -----------------------------------------------------------------------------
 * The gain has three parts and they are reported separately, because only the
 * first two are token gains:
 *
 *   1. the contract is not re-sent   ≈ −39 o200k tokens per message after the
 *      first (measured contract cost on the DAEDALUS family: 38-40);
 *   2. cross-message reuse          = rules defined once and used in later
 *      messages, plus anchored copies of long earlier spans;
 *   3. encode latency               = the single-message core below is
 *      deterministic and bounded by WORK, not by the wall clock.
 *
 * A negative result is recorded with the same care: prompt-prefix caching, the
 * obvious fourth lane, does **not** apply.  In a chat the conversation prefix is
 * `user_1 ‖ assistant_1 ‖ user_2`, so re-sending a dictionary at the head of
 * `user_2` is never a cache extension of it.  See §D of the Z44 report.
 *
 * THE SINGLE-MESSAGE CORE (also new: deterministic, work-bounded)
 * -----------------------------------------------------------------------------
 * The DAEDALUS/ARIADNE/SIBYL family bounds its search with `Date.now()`, so the
 * same input can produce different wires under load — documented twice already
 * (bench/z13-report-2026-10-11.md §2: 1664 vs 1613 on the same file;
 * bench/pr-frontier-review-2026-10-10.md: 1326 vs 1346 on find-listing).  This
 * core takes no clock at all.  Its budget is a rule count and a candidate count,
 * both integers, so the output is a pure function of the input on any machine.
 *
 * Stages, all deterministic:
 *   1. tokenise once; every original token is one symbol;
 *   2. enumerate MAXIMAL REPEATS with a suffix automaton (MR-RePair, Furuya et
 *      al., Algorithms 13(4):103, 2020) and rank by the exact integer net gain
 *      `c·(L−1) − (L+1)`;
 *   3. admit greedily in gain order, re-counting each candidate against the
 *      CURRENT sequence, so overlaps are never double-counted;
 *   4. re-mine up to `rounds` times so composite rules form;
 *   5. assign glyphs by a deterministic greedy that maximises adjacent
 *      single-token merges in the chosen script — a fixed-iteration stand-in for
 *      ARIADNE's wall-clock hill-climb;
 *   6. render the shipped CHIRON wire language and accept the wire only if the
 *      shipped `chironDecode` reproduces the input and the whole message
 *      (contract included) is cheaper than the input.
 *
 * Because stage 6 uses the shipped decoder and the shipped contract generator,
 * ANAMNESIS inherits CHIRON's three independent readers (library, prose-derived,
 * CPython) instead of adding a fourth wire language for a reader to learn.
 * =============================================================================
 */

import { countTokens, tokenStrings, type EncodingName } from './bpe';
import {
  CHIRON_START,
  CHIRON_SEP,
  CHIRON_SCRIPTS,
  chironInScript,
  chironDecode,
  chironDecoderPrompt,
  type ChironScript,
} from './chiron';
import { scriptPool } from './ariadne';
import { daedalusEncode, type DaedalusOptions } from './daedalus';

/* Marker choice is a measured cost, not a matter of taste: U+27E6 / U+27E7 are
 * three o200k_base tokens each (byte-fallback), U+00AB / U+00BB are one token in
 * o200k_base AND cl100k_base (bench/z44/dbg4.ts). A copy marker is paid once per
 * copy, so 4 tokens per marker is 4 tokens per copy thrown away. */
export const ANAMNESIS_COPY_OPEN = '«';
export const ANAMNESIS_COPY_CLOSE = '»';
export const ANAMNESIS_COPY_ELL = '·';

/* ---------------------------------------------------------------------------
 * 1. SUFFIX AUTOMATON — maximal repeats in O(n)
 * ------------------------------------------------------------------------- */

export interface Repeat { ids: number[]; c: number; net: number }

/** Every maximal repeat of `seq`, ranked by exact net gain. Deterministic. */
export function maximalRepeats(seq: number[], maxSpan: number, topK: number): Repeat[] {
  const n = seq.length;
  const out: Repeat[] = [];
  if (n < 4) return out;

  const CAP = 2 * n + 5;
  const len = new Int32Array(CAP);
  const link = new Int32Array(CAP).fill(-1);
  const cnt = new Int32Array(CAP);
  const firstEnd = new Int32Array(CAP).fill(-1);
  const next: Array<Map<number, number>> = new Array(CAP);
  next[0] = new Map();
  let sz = 1, last = 0;
  for (let i = 0; i < n; i++) {
    const c = seq[i];
    const cur = sz++;
    next[cur] = new Map();
    len[cur] = len[last] + 1;
    cnt[cur] = 1;
    firstEnd[cur] = i;
    let p = last;
    while (p !== -1 && !next[p].has(c)) { next[p].set(c, cur); p = link[p]; }
    if (p === -1) link[cur] = 0;
    else {
      const q = next[p].get(c)!;
      if (len[p] + 1 === len[q]) link[cur] = q;
      else {
        const cl = sz++;
        next[cl] = new Map(next[q]);
        len[cl] = len[p] + 1;
        link[cl] = link[q];
        firstEnd[cl] = firstEnd[q];
        cnt[cl] = 0;
        while (p !== -1 && next[p].get(c) === q) { next[p].set(c, cl); p = link[p]; }
        link[q] = cl; link[cur] = cl;
      }
    }
    last = cur;
  }
  const bucket = new Int32Array(n + 2);
  for (let v = 0; v < sz; v++) bucket[len[v]]++;
  for (let i = 1; i <= n; i++) bucket[i] += bucket[i - 1];
  const order = new Int32Array(sz);
  for (let v = sz - 1; v >= 0; v--) order[--bucket[len[v]]] = v;
  for (let i = sz - 1; i >= 1; i--) { const v = order[i]; if (link[v] > 0) cnt[link[v]] += cnt[v]; }

  const seen = new Set<string>();
  for (let v = 1; v < sz; v++) {
    const c = cnt[v];
    if (c < 2) continue;
    const L = Math.min(len[v], maxSpan);
    if (L < 2) continue;
    const net = c * (L - 1) - (L + 1);
    if (net <= 0) continue;
    const end = firstEnd[v];
    const st = end - L + 1;
    if (st < 0) continue;
    const ids = seq.slice(st, end + 1);
    const key = ids.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ids, c, net });
  }
  // Sort by (net desc, ids length desc, then lexicographic) so the order is a
  // total order and never depends on Map/Set iteration luck.
  out.sort((a, b) => b.net - a.net || b.ids.length - a.ids.length || cmpIds(a.ids, b.ids));
  return out.slice(0, topK);
}

function cmpIds(a: number[], b: number[]): number {
  const m = Math.min(a.length, b.length);
  for (let i = 0; i < m; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/* ---------------------------------------------------------------------------
 * 2. GRAMMAR + GREEDY ADMISSION
 * ------------------------------------------------------------------------- */

export interface FastGrammar {
  /** symbol id -> literal text it stands for */
  symText: string[];
  /**
   * symbol id -> is this a RULE symbol?
   *
   * This used to be inferred from `symText[s] === ''`. That is wrong, and not
   * only in theory: 85 o200k_base ids decode to the empty string on their own
   * (byte-fallback tokens; `bench/z44/dbg3.ts`), so a literal run containing e.g.
   * U+27E6 interned as an empty-text symbol and was then mistaken for a rule.
   * The flag makes the two cases distinct by construction.
   */
  isRule: boolean[];
  main: number[];
  /** rule symbol id -> body symbol ids, in admission order */
  rules: Array<{ sym: number; body: number[] }>;
}

export function fastMine(segs: string[], opts: { maxSpan: number; rounds: number; topK: number; maxRules: number }): FastGrammar {
  const indexOf = new Map<string, number>();
  const symText: string[] = [];
  const isRule: boolean[] = [];
  const main: number[] = [];
  for (const s of segs) {
    let id = indexOf.get(s);
    if (id === undefined) { id = symText.length; symText.push(s); isRule.push(false); indexOf.set(s, id); }
    main.push(id);
  }
  const g: FastGrammar = { symText, isRule, main, rules: [] };
  for (let round = 0; round < opts.rounds; round++) {
    if (g.rules.length >= opts.maxRules) break;
    const cands = maximalRepeats(g.main, opts.maxSpan, opts.topK);
    if (!cands.length) break;
    let admitted = 0;
    for (const c of cands) {
      if (g.rules.length >= opts.maxRules) break;
      // re-count against the CURRENT sequence: occurrences may have been
      // consumed by an earlier admission, and counting stale ones is exactly
      // how greedy RePair over-admits.
      const hits = countNonOverlapping(g.main, c.ids);
      if (hits < 2) continue;
      const net = hits * (c.ids.length - 1) - (c.ids.length + 1);
      if (net <= 0) continue;
      const sym = g.symText.length;
      g.symText.push('');
      g.isRule.push(true);
      g.rules.push({ sym, body: c.ids.slice() });
      replaceAll(g.main, c.ids, sym);
      admitted++;
    }
    if (!admitted) break;
  }
  return g;
}

/** Non-overlapping, left-to-right occurrence count. */
export function countNonOverlapping(seq: number[], pat: number[]): number {
  let n = 0, i = 0;
  const first = pat[0];
  while (i + pat.length <= seq.length) {
    if (seq[i] !== first) { i++; continue; }
    let ok = true;
    for (let j = 1; j < pat.length; j++) if (seq[i + j] !== pat[j]) { ok = false; break; }
    if (ok) { n++; i += pat.length; } else i++;
  }
  return n;
}

/** In-place non-overlapping left-to-right substitution. */
export function replaceAll(seq: number[], pat: number[], sym: number): void {
  const first = pat[0];
  const out: number[] = [];
  let i = 0;
  while (i < seq.length) {
    if (seq[i] === first && i + pat.length <= seq.length) {
      let ok = true;
      for (let j = 1; j < pat.length; j++) if (seq[i + j] !== pat[j]) { ok = false; break; }
      if (ok) { out.push(sym); i += pat.length; continue; }
    }
    out.push(seq[i]); i++;
  }
  seq.length = 0;
  for (const x of out) seq.push(x);
}

/* ---------------------------------------------------------------------------
 * 3. GLYPH ASSIGNMENT — deterministic, merge-aware
 * ------------------------------------------------------------------------- */

const SCRIPT_ORDER = ['cjk', 'cyrillic', 'hangul', 'katakana', 'arabic', 'myanmar', 'khmer'];

function pickScript(text: string, need: number, enc: EncodingName): { script: ChironScript; chars: string[] } | null {
  const inText = new Set<string>();
  for (const ch of text) inText.add(ch);
  for (const name of SCRIPT_ORDER) {
    const sc = CHIRON_SCRIPTS.find(s => s.name === name);
    if (!sc) continue;
    let pool: string[];
    try { pool = scriptPool(sc, enc, false).chars; } catch { continue; }
    const usable = pool.filter(c => !inText.has(c));
    if (usable.length >= need) return { script: sc, chars: usable };
  }
  return null;
}

/**
 * Greedy injective assignment that maximises adjacent single-token merges.
 *
 * ARIADNE hill-climbs this against the live tokenizer inside a wall-clock
 * envelope. Here the same objective is optimised by a fixed number of integer
 * steps: process rule symbols in descending adjacency weight, and give each the
 * pool character that completes the most already-assigned 1-token pairs. Same
 * input always yields the same assignment, on any machine, at any load.
 */
export function assignGlyphs(
  g: FastGrammar,
  chars: string[],
  pairs: Set<string>,
): Map<number, string> {
  const isRule = new Set<number>(g.rules.map(r => r.sym));
  const weight = new Map<number, number>();
  const adj = new Map<number, Map<number, number>>();
  const bump = (a: number, b: number) => {
    if (a === b) return;
    let m = adj.get(a); if (!m) { m = new Map(); adj.set(a, m); }
    m.set(b, (m.get(b) ?? 0) + 1);
    weight.set(a, (weight.get(a) ?? 0) + 1);
    weight.set(b, (weight.get(b) ?? 0) + 1);
  };
  const walk = (seq: number[]) => {
    for (let i = 0; i + 1 < seq.length; i++) {
      const a = seq[i], b = seq[i + 1];
      if (isRule.has(a) && isRule.has(b)) bump(a, b);
    }
  };
  walk(g.main);
  for (const r of g.rules) walk(r.body);

  const order = [...isRule].sort((a, b) => (weight.get(b) ?? 0) - (weight.get(a) ?? 0) || a - b);
  const partners = new Map<string, Set<string>>();
  for (const p of pairs) {
    const a = [...p];
    if (a.length !== 2) continue;
    let s = partners.get(a[0]); if (!s) { s = new Set(); partners.set(a[0], s); }
    s.add(a[1]);
    let t = partners.get(a[1]); if (!t) { t = new Set(); partners.set(a[1], t); }
    t.add(a[0]);
  }

  const assign = new Map<number, string>();
  const used = new Set<string>();
  const charOf = new Map<string, number>();
  for (const sym of order) {
    const neighbours = adj.get(sym);
    let bestChar = '';
    let bestScore = -1;
    for (const c of chars) {
      if (used.has(c)) continue;
      let score = 0;
      if (neighbours) {
        const pt = partners.get(c);
        if (pt) for (const [nb, w] of neighbours) {
          const g2 = assign.get(nb);
          if (g2 !== undefined && pt.has(g2)) score += w;
        }
      }
      if (score > bestScore) { bestScore = score; bestChar = c; if (score > 0 && bestScore === score) break; }
    }
    if (!bestChar) {
      for (const c of chars) if (!used.has(c)) { bestChar = c; break; }
    }
    if (!bestChar) break;
    used.add(bestChar);
    assign.set(sym, bestChar);
    charOf.set(bestChar, sym);
  }
  return assign;
}

/* ---------------------------------------------------------------------------
 * 4. RENDER
 * ------------------------------------------------------------------------- */

function renderSymbol(g: FastGrammar, assign: Map<number, string>, sym: number): string | null {
  const gl = assign.get(sym);
  if (gl !== undefined) return gl;
  if (g.isRule[sym]) return null;   // a rule with no glyph cannot be rendered
  return g.symText[sym];
}

export interface FastResult {
  codec: 'anamnesis';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  rules: number;
  script: string;
  ms: number;
  mode: 'anamnesis' | 'raw';
  notes: string;
}

function rawResult(text: string, enc: EncodingName, started: number, why: string): FastResult {
  const inTokens = countTokens(text, enc);
  return {
    codec: 'anamnesis', wire: text, decoded: text, exact: true, inTokens,
    outTokens: inTokens, messageTokens: inTokens, contractTokens: 0,
    decoderPrompt: text, savingsPct: 0, rules: 0, script: 'none',
    ms: now() - started, mode: 'raw', notes: `identity: ${why}`,
  };
}

export interface AnamnesisOptions {
  maxSpan?: number;
  rounds?: number;
  topK?: number;
  maxRules?: number;
  /** extra text the contract must carry (the session clause, for message 1) */
  contractExtra?: string;
}

/** Deterministic single-message core. No wall clock anywhere in the search. */
export function anamnesisCore(text: string, enc: EncodingName = 'o200k_base', options: AnamnesisOptions = {}): FastResult {
  const started = now();
  const inTokens = countTokens(text, enc);
  if (text.length < 24) return rawResult(text, enc, started, 'input shorter than 24 characters');

  const segs = tokenStrings(text, enc).map(x => x.s);
  const g = fastMine(segs, {
    maxSpan: options.maxSpan ?? 24,
    rounds: options.rounds ?? 4,
    topK: options.topK ?? 3000,
    maxRules: options.maxRules ?? 2500,
  });
  if (!g.rules.length) return rawResult(text, enc, started, 'no maximal repeat cleared the net-gain gate');

  const pick = pickScript(text, g.rules.length, enc);
  if (!pick) return rawResult(text, enc, started, `no script alphabet has ${g.rules.length} unused single-token letters`);
  const assign = assignGlyphs(g, pick.chars, scriptPool(pick.script, enc, false).pairs);
  if (assign.size < g.rules.length) return rawResult(text, enc, started, 'glyph pool exhausted during assignment');

  let tape = '';
  for (const r of g.rules) {
    const gl = assign.get(r.sym)!;
    let body = '';
    let bad = false;
    for (const s of r.body) { const t = renderSymbol(g, assign, s); if (t === null) { bad = true; break; } body += t; }
    if (bad) return rawResult(text, enc, started, 'a rule referenced a later rule; rendering declined');
    tape += gl + body;
  }
  let bodyOut = '';
  for (const s of g.main) { const t = renderSymbol(g, assign, s); if (t === null) return rawResult(text, enc, started, 'body referenced an unassigned rule'); bodyOut += t; }

  const wire = CHIRON_START + tape + CHIRON_SEP + bodyOut;
  const decoded = chironDecode(wire);
  if (decoded !== text) return rawResult(text, enc, started, 'exactness gate: chironDecode(wire) !== text');
  const prompt = chironDecoderPrompt(wire) + (options.contractExtra ?? '');
  const messageTokens = countTokens(prompt, enc);
  const outTokens = countTokens(wire, enc);
  if (messageTokens >= inTokens) {
    return { ...rawResult(text, enc, started, `message gate: ${messageTokens} >= raw ${inTokens}`), rules: g.rules.length };
  }
  return {
    codec: 'anamnesis', wire, decoded, exact: true, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens, decoderPrompt: prompt,
    savingsPct: inTokens ? Math.round((1 - messageTokens / inTokens) * 1000) / 10 : 0,
    rules: g.rules.length, script: pick.script.name, ms: now() - started, mode: 'anamnesis',
    notes: `deterministic core: ${g.rules.length} maximal-repeat rules, script=${pick.script.name}, wire=${outTokens}, contract=${messageTokens - outTokens}`,
  };
}

/* ---------------------------------------------------------------------------
 * 5. ANCHORED COPIES FROM EARLIER CHAT TEXT
 * ------------------------------------------------------------------------- */

export interface CopyOpts { k?: number; minCopy?: number; minAnchor?: number }

/**
 * Replace spans of `T` that occur verbatim in the earlier chat text `C` with
 * `⟦head…tail⟧`. The reader restores the span by finding `head` in the earlier
 * decoded text and running to the end of the first `tail` after it.
 *
 * Unlike ctxcopy.ts this is (a) gated — a copy is emitted only when the literal
 * it replaces costs strictly more tokens than the marker, measured with the real
 * tokenizer — and (b) anchor-uniqueness-checked by simulating the decoder.
 */
export function anchoredCopies(T: string, C: string, enc: EncodingName, opts: CopyOpts = {}): { wire: string; copies: number; saved: number } {
  const k = opts.k ?? 10;
  const minCopy = opts.minCopy ?? 24;
  const minAnchor = opts.minAnchor ?? 8;
  if (T.includes(ANAMNESIS_COPY_OPEN) || T.includes(ANAMNESIS_COPY_CLOSE) || T.includes(ANAMNESIS_COPY_ELL)) {
    return { wire: T, copies: 0, saved: 0 };
  }
  if (C.includes(ANAMNESIS_COPY_OPEN) || C.includes(ANAMNESIS_COPY_CLOSE) || C.includes(ANAMNESIS_COPY_ELL)) {
    return { wire: T, copies: 0, saved: 0 };
  }
  // k-gram index over C
  const index = new Map<string, number[]>();
  for (let j = 0; j + k <= C.length; j++) {
    const g = C.substr(j, k);
    const a = index.get(g);
    if (a) a.push(j); else index.set(g, [j]);
  }
  const cursor = { pos: 0 };
  const simulate = (head: string, tail: string): { start: number; end: number } | null => {
    const a = C.indexOf(head, cursor.pos);
    if (a < 0) return null;
    const b = C.indexOf(tail, a + head.length);
    if (b < 0) return null;
    return { start: a, end: b + tail.length };
  };

  const out: string[] = [];
  let i = 0, copies = 0, saved = 0;
  let lastLit = 0;
  const flush = (upto: number) => { out.push(T.slice(lastLit, upto)); };
  while (i + k <= T.length) {
    const g = T.substr(i, k);
    const cands = index.get(g);
    if (!cands) { i++; continue; }
    // grow the match to its maximal length at this position
    let bestEnd = -1;
    for (const c0 of cands) {
      let l = k;
      while (i + l < T.length && c0 + l < C.length && T[i + l] === C[c0 + l]) l++;
      if (i + l > bestEnd) bestEnd = i + l;
    }
    const len = bestEnd - i;
    if (len < minCopy) { i++; continue; }
    // anchors: the head and tail of the span, long enough to be found again
    const headLen = Math.min(len, Math.max(minAnchor, Math.ceil(len * 0.18)));
    const tailLen = Math.min(len - headLen, Math.max(minAnchor, Math.ceil(len * 0.18)));
    if (headLen + tailLen >= len) { i++; continue; }
    const head = T.slice(i, i + headLen);
    const tail = T.slice(bestEnd - tailLen, bestEnd);
    const span = T.slice(i, bestEnd);
    // decoder simulation: the reader searches forward from its own cursor
    const sim = simulate(head, tail);
    if (!sim || C.slice(sim.start, sim.end) !== span) { i++; continue; }
    const marker = ANAMNESIS_COPY_OPEN + head + ANAMNESIS_COPY_ELL + tail + ANAMNESIS_COPY_CLOSE;
    const costSpan = countTokens(span, enc);
    const costMark = countTokens(marker, enc);
    if (costMark >= costSpan) { i++; continue; }
    flush(i);
    out.push(marker);
    lastLit = bestEnd;
    cursor.pos = sim.end;
    saved += costSpan - costMark;
    copies++;
    i = bestEnd;
  }
  flush(T.length);
  return { wire: out.join(''), copies, saved };
}

/** Exact inverse of `anchoredCopies`, given the same earlier text. */
export function expandCopies(wire: string, C: string): string | null {
  let out = '';
  let p = 0;
  let cursor = 0;
  while (p < wire.length) {
    const o = wire.indexOf(ANAMNESIS_COPY_OPEN, p);
    if (o < 0) { out += wire.slice(p); break; }
    out += wire.slice(p, o);
    const c = wire.indexOf(ANAMNESIS_COPY_CLOSE, o + 1);
    if (c < 0) return null;
    const body = wire.slice(o + 1, c);
    const e = body.indexOf(ANAMNESIS_COPY_ELL);
    if (e < 0) return null;
    const head = body.slice(0, e);
    const tail = body.slice(e + 1);
    const a = C.indexOf(head, cursor);
    if (a < 0) return null;
    const b = C.indexOf(tail, a + head.length);
    if (b < 0) return null;
    const end = b + tail.length;
    out += C.slice(a, end);
    cursor = end;
    p = c + 1;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 6. THE SESSION CODEC
 * ------------------------------------------------------------------------- */

export interface SessionRule { glyph: string; text: string; toks: string[] }

export interface AnamnesisSession {
  enc: EncodingName;
  /** cumulative dictionary, in the order the reader first saw it */
  rules: SessionRule[];
  glyphOf: Map<string, SessionRule>;
  usedGlyphs: Set<string>;
  /** decoded text of every earlier message — what the reader can copy from */
  priorText: string[];
}

export function createSession(enc: EncodingName = 'o200k_base'): AnamnesisSession {
  return { enc, rules: [], glyphOf: new Map(), usedGlyphs: new Set(), priorText: [] };
}

export const ANAMNESIS_SESSION_CLAUSE =
  ` Rule letters defined in an earlier message of this chat stay in force. ${ANAMNESIS_COPY_OPEN}a${ANAMNESIS_COPY_ELL}b${ANAMNESIS_COPY_CLOSE} copies the earlier decoded text from the first a to the end of the first b after it.`;

export interface AnamnesisMessage {
  index: number;
  wire: string;
  decoded: string;
  exact: boolean;
  rawTokens: number;
  /** tokens of THIS message as transmitted */
  messageTokens: number;
  /** full-price tokens of this message (contract only exists on the first) */
  contractTokens: number;
  mode: 'anamnesis-first' | 'anamnesis-session' | 'raw';
  newRules: number;
  reusedRules: number;
  copies: number;
  notes: string;
}

export interface AnamnesisSessionResult {
  messages: AnamnesisMessage[];
  rawTokens: number;
  sessionTokens: number;
  /** what the same messages cost one-per-chat, contract every time */
  isolatedTokens: number;
  savingVsIsolated: number;
  exactAll: boolean;
  ms: number;
}

/**
 * Encode message `index` of a session. The session state is advanced only if the
 * caller keeps the returned message, so a caller may reject a message and the
 * state stays consistent.
 */
export function anamnesisEncodeMessage(
  text: string,
  session: AnamnesisSession,
  options: AnamnesisOptions & CopyOpts = {},
): AnamnesisMessage {
  const enc = session.enc;
  const index = session.priorText.length;
  const rawTokens = countTokens(text, enc);
  const fail = (why: string, mode: AnamnesisMessage['mode']): AnamnesisMessage => {
    // The reader still sees this message, so it still joins the recollectable
    // context. Without this every fallback froze the session at index 0 and no
    // later message could copy or recollect anything.
    session.priorText = [...session.priorText, text];
    return {
      index, wire: text, decoded: text, exact: true, rawTokens, messageTokens: rawTokens,
      contractTokens: 0, mode, newRules: 0, reusedRules: 0, copies: 0, notes: why,
    };
  };

  /* ---- stage 1: anchored copies out of the earlier chat text ---- */
  const C = session.priorText.join('\n');
  let staged = text;
  let copies = 0;
  let copySaved = 0;
  if (index > 0 && C.length) {
    const r = anchoredCopies(text, C, enc, { k: options.k, minCopy: options.minCopy, minAnchor: options.minAnchor });
    if (r.copies > 0 && expandCopies(r.wire, C) === text) { staged = r.wire; copies = r.copies; copySaved = r.saved; }
  }

  /* ---- stage 2: the cumulative dictionary, longest rule first ---- */
  const segs = tokenStrings(staged, enc).map(x => x.s);
  const byLen = [...session.rules].sort((a, b) => b.toks.length - a.toks.length || a.glyph.localeCompare(b.glyph));
  const symText: string[] = [];
  const isRule: boolean[] = [];
  const idOf = new Map<string, number>();
  const glyphSym = new Map<string, number>();
  const intern = (s: string) => { let id = idOf.get(s); if (id === undefined) { id = symText.length; symText.push(s); isRule.push(false); idOf.set(s, id); } return id; };
  const main: number[] = segs.map(intern);
  for (const r of byLen) {
    if (r.toks.length < 2) continue;
    const pat = r.toks.map(intern);
    if (countNonOverlapping(main, pat) < 1) continue;
    const gs = symText.length; symText.push(''); isRule.push(true);
    glyphSym.set(r.glyph, gs);
    replaceAll(main, pat, gs);
  }
  const reusedRules = glyphSym.size;

  /* ---- stage 3: new rules mined inside this message ----
   * Mining runs on the CURRENT symbol space — that is, after the recollected
   * glyphs have been substituted — so a new rule can be built out of glyphs the
   * reader already knows. A new rule whose body is `已知 + two tokens` therefore
   * costs three symbols to define and one to use, which is the whole point of a
   * cumulative dictionary: the expensive half was paid in an earlier message. */
  const g: FastGrammar = { symText, isRule, main, rules: [] };
  for (let round = 0; round < (options.rounds ?? 4); round++) {
    if (g.rules.length >= (options.maxRules ?? 2500)) break;
    const cands = maximalRepeats(g.main, options.maxSpan ?? 24, options.topK ?? 3000);
    if (!cands.length) break;
    let admitted = 0;
    for (const c of cands) {
      if (g.rules.length >= (options.maxRules ?? 2500)) break;
      const hits = countNonOverlapping(g.main, c.ids);
      if (hits < 2) continue;
      const net = hits * (c.ids.length - 1) - (c.ids.length + 1);
      if (net <= 0) continue;
      const sym = g.symText.length;
      g.symText.push('');
      g.isRule.push(true);
      g.rules.push({ sym, body: c.ids.slice() });
      replaceAll(g.main, c.ids, sym);
      admitted++;
    }
    if (!admitted) break;
  }

  const needGlyphs = g.rules.length;
  if (needGlyphs === 0 && reusedRules === 0 && copies === 0) {
    return fail('nothing recollectable: no earlier rule reused, no new repeat, no anchored copy', index ? 'raw' : 'raw');
  }

  /* ---- stage 4: glyphs. Reused rules keep their old letter. ---- */
  const banned = new Set<string>(session.usedGlyphs);
  for (const ch of staged) banned.add(ch);
  const pick = pickScriptFrom(banned, Math.max(1, needGlyphs), enc);
  if (!pick && needGlyphs > 0) return fail('no script alphabet has enough unused letters', index ? 'raw' : 'raw');
  const pairs = pick ? scriptPool(pick.script, enc, false).pairs : new Set<string>();
  const assign = new Map<number, string>();
  for (const [glyph, sym] of glyphSym) assign.set(sym, glyph);
  if (needGlyphs > 0 && pick) {
    const fresh = assignGlyphs(g, pick.chars.filter(c => !session.usedGlyphs.has(c)), pairs);
    for (const [sym, ch] of fresh) if (!assign.has(sym)) assign.set(sym, ch);
    for (const r of g.rules) if (!assign.has(r.sym)) return fail('glyph pool exhausted', index ? 'raw' : 'raw');
  }

  /* ---- stage 5: render the shipped CHIRON frame ---- */
  const render = (sym: number): string | null => {
    const gl = assign.get(sym);
    if (gl !== undefined) return gl;
    if (g.isRule[sym]) return null;
    return g.symText[sym];
  };
  let tape = '';
  for (const r of g.rules) {
    let body = '';
    for (const s of r.body) {
      const t = render(s);
      if (t === null) {
        if (typeof process !== 'undefined' && process.env.ANAMNESIS_DEBUG) {
          // eslint-disable-next-line no-console
          console.error('DUMP sym=' + s + ' symTextLen=' + g.symText.length + ' rules=' + g.rules.length +
            ' ruleSyms=' + JSON.stringify(g.rules.map(r => r.sym)) +
            ' glyphSym=' + JSON.stringify([...glyphSym.entries()]) +
            ' assignKeys=' + JSON.stringify([...assign.keys()]) +
            ' bodySym=' + s + ' text=' + JSON.stringify(g.symText[s]));
        }
        return fail(`a new rule referenced symbol ${s} with no glyph and no literal text`, index ? 'raw' : 'raw');
      }
      body += t;
    }
    tape += assign.get(r.sym)! + body;
  }
  let bodyOut = '';
  for (const s of g.main) { const t = render(s); if (t === null) return fail('body referenced an unassigned rule', index ? 'raw' : 'raw'); bodyOut += t; }
  // NOTE the parentheses: `tape || bodyOut ? A : B` binds as `tape || (bodyOut ? A : B)`,
  // which silently emitted the bare tape with no frame and no body.
  const wire = (tape || bodyOut) ? CHIRON_START + tape + CHIRON_SEP + bodyOut : staged;

  /* ---- stage 6: verify against the reader's actual knowledge, then commit ---- */
  const priorCount = session.rules.length;
  const probe = createSession(enc);
  probe.rules = session.rules.slice();
  probe.glyphOf = new Map(session.glyphOf);
  probe.usedGlyphs = new Set(session.usedGlyphs);
  probe.priorText = session.priorText.slice();
  for (const r of g.rules) {
    const gl = assign.get(r.sym)!;
    let body = '';
    for (const s of r.body) { const t = render(s); if (t === null) return fail('verify: unassigned rule', index ? 'raw' : 'raw'); body += t; }
    probe.usedGlyphs.add(gl);
    probe.rules.push({ glyph: gl, text: body, toks: tokenStrings(body, enc).map(x => x.s) });
    probe.glyphOf.set(gl, probe.rules[probe.rules.length - 1]);
  }
  const decoded = anamnesisDecodeWith(wire, session.rules.slice(0, priorCount), C);
  if (decoded !== text) {
    if (typeof process !== 'undefined' && process.env.ANAMNESIS_DEBUG && decoded !== null) {
      let i = 0; while (i < Math.min(decoded.length, text.length) && decoded[i] === text[i]) i++;
      // eslint-disable-next-line no-console
      console.error('MISMATCH at ' + i + ' got=' + JSON.stringify(decoded.slice(Math.max(0, i - 40), i + 40)) + ' want=' + JSON.stringify(text.slice(Math.max(0, i - 40), i + 40)));
    }
    return fail(`exactness gate: decode(wire) !== text (${copySaved} copy tokens, ${reusedRules} reused)`, index ? 'raw' : 'raw');
  }

  // chironDecoderPrompt(wire) is `wire + "\n" + clauses`, so the contract cost is
  // the prompt minus the wire. Counting the prompt as the contract double-charges
  // the wire; that bug cost 393 instead of 39 on the first message here.
  const contract = index === 0 ? chironDecoderPrompt(wire) + ANAMNESIS_SESSION_CLAUSE : '';
  const contractTokens = contract ? countTokens(contract, enc) - countTokens(wire, enc) : 0;
  const messageTokens = countTokens(wire, enc) + contractTokens;
  if (messageTokens >= rawTokens) return fail(`message gate: ${messageTokens} >= raw ${rawTokens}`, index ? 'raw' : 'raw');

  // commit
  session.rules = probe.rules;
  session.glyphOf = probe.glyphOf;
  session.usedGlyphs = probe.usedGlyphs;
  session.priorText = [...session.priorText, text];

  return {
    index, wire, decoded, exact: true, rawTokens, messageTokens, contractTokens,
    mode: index === 0 ? 'anamnesis-first' : 'anamnesis-session',
    newRules: g.rules.length, reusedRules, copies,
    notes: `${g.rules.length} new rule(s), ${reusedRules} recollected from earlier messages, ${copies} anchored cop${copies === 1 ? 'y' : 'ies'} (−${copySaved} tok), wire=${countTokens(wire, enc)} contract=${contractTokens}`,
  };
}

function pickScriptFrom(banned: Set<string>, need: number, enc: EncodingName): { script: ChironScript; chars: string[] } | null {
  for (const name of SCRIPT_ORDER) {
    const sc = CHIRON_SCRIPTS.find(s => s.name === name);
    if (!sc) continue;
    let pool: string[];
    try { pool = scriptPool(sc, enc, false).chars; } catch { continue; }
    const usable = pool.filter(c => !banned.has(c));
    if (usable.length >= need) return { script: sc, chars: usable };
  }
  return null;
}

/**
 * Decode one session wire against the rules the reader learned EARLIER and the
 * earlier chat text. Exact and total: returns null only for a malformed wire.
 *
 * `priorRules` are the rules defined by the messages before this one. The rules
 * this wire defines are exactly the in-script letters in its tape that are not
 * prior glyphs — the encoder never reuses a letter, so the split is decidable
 * from the wire plus the reader's own memory. Getting this wrong is measurable:
 * an earlier revision re-derived "which letters does this tape define" by
 * parsing, and a prior glyph quoted inside a new rule's body was mistaken for a
 * new definition, so it was dropped from the prepended closure and the round
 * trip failed (bench/z44/dbg2.ts, session ops-log-tails m1).
 *
 * The tape handed to the shipped decoder is `closure ++ ownTape`:
 *
 *  1. The closure is TRANSITIVE. Rule `一` expands to text containing `的`, `中`
 *     and `佂`, and `中` contains `人` and `彩`, so a body that uses only `一`
 *     still needs all five.
 *  2. The closure is emitted in the order the reader learned the rules, which is
 *     dependency order: CHIRON's tape parser ends a rule's text at the next
 *     letter it has not seen yet, so a rule must never precede one it quotes.
 */
export function anamnesisDecodeWith(wire: string, priorRules: SessionRule[], priorContext: string): string | null {
  if (!wire.startsWith(CHIRON_START)) {
    return priorContext ? expandCopies(wire, priorContext) : wire;
  }
  const cut = wire.indexOf(CHIRON_SEP, 1);
  if (cut < 0) return null;
  const ownTape = wire.slice(1, cut);
  const body = wire.slice(cut + 1);
  const priorGlyphs = new Set<string>();
  for (const r of priorRules) priorGlyphs.add(r.glyph);

  // the letters THIS tape defines: in-script, not a prior glyph, first occurrence
  const seen = new Set<string>();
  if (ownTape) {
    const sc = CHIRON_SCRIPTS.find(x => chironInScript(x, ownTape[0].codePointAt(0)!));
    if (!sc) return null;
    let i = 0;
    while (i < ownTape.length) {
      const gl = ownTape[i];
      if (!chironInScript(sc, gl.codePointAt(0)!) || priorGlyphs.has(gl) || seen.has(gl)) return null;
      seen.add(gl);
      let j = i + 1;
      while (j < ownTape.length && !(chironInScript(sc, ownTape[j].codePointAt(0)!) && !priorGlyphs.has(ownTape[j]) && !seen.has(ownTape[j]))) j++;
      i = j;
    }
  }

  // transitive closure of the prior rules this wire needs
  const byGlyph = new Map<string, SessionRule>();
  for (const r of priorRules) byGlyph.set(r.glyph, r);
  const want = new Set<string>();
  const queue: string[] = [];
  const scan = (t: string) => { for (const r of priorRules) if (!want.has(r.glyph) && t.includes(r.glyph)) { want.add(r.glyph); queue.push(r.glyph); } };
  scan(body);
  scan(ownTape);
  while (queue.length) {
    const gl = queue.pop()!;
    const r = byGlyph.get(gl);
    if (r) scan(r.text);
  }
  let extra = '';
  for (const r of priorRules) if (want.has(r.glyph)) extra += r.glyph + r.text;

  const full = CHIRON_START + extra + ownTape + CHIRON_SEP + body;
  const decoded = chironDecode(full);
  if (decoded === full) return null;
  return priorContext ? expandCopies(decoded, priorContext) : decoded;
}

/** The full reader message for one session message (contract only on the first). */
export function anamnesisMessagePrompt(msg: AnamnesisMessage): string {
  // chironDecoderPrompt(wire) already IS `wire + "\n" + clauses`, so appending the
  // wire again would send it twice. The earlier revision did exactly that; the
  // token accounting was unaffected (it counts wire + clauses) but the fixture it
  // printed was not the message a user would paste.
  // A message that fell back to raw needs no contract at all: it is plain text.
  if (msg.index === 0 && msg.wire.startsWith(CHIRON_START)) {
    return chironDecoderPrompt(msg.wire) + ANAMNESIS_SESSION_CLAUSE;
  }
  return msg.wire;
}

export function anamnesisEncodeSession(texts: string[], enc: EncodingName = 'o200k_base', options: AnamnesisOptions & CopyOpts = {}): AnamnesisSessionResult {
  const started = now();
  const session = createSession(enc);
  const messages: AnamnesisMessage[] = [];
  let rawTokens = 0, sessionTokens = 0, isolatedTokens = 0, exactAll = true;
  for (const t of texts) {
    const m = anamnesisEncodeMessage(t, session, options);
    messages.push(m);
    rawTokens += m.rawTokens;
    sessionTokens += m.messageTokens;
    // the same message sent as its own chat: contract every time
    isolatedTokens += m.mode === 'raw' ? m.rawTokens : countTokens(m.wire, enc) + countTokens(chironDecoderPrompt(m.wire), enc);
    if (!m.exact || m.decoded !== t) exactAll = false;
  }
  return {
    messages, rawTokens, sessionTokens, isolatedTokens,
    savingVsIsolated: isolatedTokens - sessionTokens, exactAll, ms: now() - started,
  };
}

/* ---------------------------------------------------------------------------
 * 7. REGISTRY-FACING SINGLE-MESSAGE ENCODER
 * ------------------------------------------------------------------------- */

export interface AnamnesisResult extends FastResult {
  /** set when the shipped frontier encoder was strictly better on this input */
  delegated: boolean;
  delegateM: number;
}

/**
 * Single message, one chat, contract in-band. The deterministic core runs first;
 * the shipped frontier encoder is then consulted and kept only when it is
 * strictly cheaper, so this entry point can never lose to the frontier it is
 * compared against. That comparison is a gate, not a search: it is one call.
 */
export function anamnesisEncode(text: string, enc: EncodingName = 'o200k_base', options: AnamnesisOptions & { daedalus?: DaedalusOptions; gate?: boolean } = {}): AnamnesisResult {
  const started = now();
  const core = anamnesisCore(text, enc, options);
  let best: AnamnesisResult = { ...core, delegated: false, delegateM: core.messageTokens };
  if (options.gate === false) { best.ms = now() - started; return best; }
  try {
    const d = daedalusEncode(text, enc, options.daedalus ?? {});
    if (d.decoded === text && d.messageTokens < best.messageTokens) {
      best = {
        codec: 'anamnesis', wire: d.wire, decoded: d.decoded, exact: true, inTokens: d.inTokens,
        outTokens: d.outTokens, messageTokens: d.messageTokens, contractTokens: d.contractTokens,
        decoderPrompt: d.decoderPrompt, savingsPct: d.savingsPct, rules: d.phraseRules + d.wordRules,
        script: d.script, ms: now() - started, mode: 'anamnesis',
        notes: `frontier arm cheaper (${d.messageTokens} vs core ${core.messageTokens}); ${d.notes}`,
        delegated: true, delegateM: d.messageTokens,
      };
    } else {
      best.delegateM = d.messageTokens;
      best.notes = `${core.notes}; frontier arm ${d.messageTokens}`;
    }
  } catch { /* the core stands alone */ }
  best.ms = now() - started;
  return best;
}

export const anamnesisDecode = chironDecode;
export const anamnesisDecoderPrompt = chironDecoderPrompt;
