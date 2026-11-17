/**
 * src/lib/omega/veltistos.ts — X120. ΒΕΛΤΙΣΤΟΣ (veltistos, "best, optimal").
 * =============================================================================
 *
 * THE QUANTIFIER EVERY DICTIONARY CODEC IN THIS STACK INHERITS
 * -----------------------------------------------------------------------------
 * ΧΕΙΡΩΝ builds its tape by admitting a substring as a rule and then spelling
 * EVERY occurrence of that substring with the glyph.  The admission test is
 * greedy and global-per-rule.  Every wire-level codec after it inherits the same
 * quantifier: ΔΙΑΓΡΑΦΗ deletes a rule (all uses), ΣΥΝΔΥΑΣΜΟΣ / ΓΕΝΝΑΔΑΣ / ΠΡΟΑΓΩΓΗ
 * re-spell a whole value, ΜΕΤΑΤΑΞΙΣ permutes whole entries, ΙΣΟΜΟΡΦΙΑ swaps two
 * letters everywhere, and X119's ΔΙΓΛΩΣΣΙΑ moves one site at a time by local
 * descent.  Nothing in the stack asks the global question:
 *
 *     given this tape, what is the CHEAPEST spelling of the whole body as an
 *     interleaving of literal characters and rule glyphs?
 *
 * That question is a shortest path, and this module answers it exactly inside a
 * stated cost model.  Nodes are positions in the decoded text; edges are "emit
 * one literal character" (advance 1) and "emit glyph g" (advance |value(g)|).
 * The path cost is the token count of the emitted string.
 *
 * THE STATE IS A THEOREM, NOT A WINDOW
 * -----------------------------------------------------------------------------
 * BPE merges never cross a pre-tokenizer chunk (bpe.ts, "chunk-boundary
 * invariance"), so the marginal cost of appending a piece depends only on the
 * end of what has been emitted. The first X120 draft approximated "the end" by
 * the last 24 or 32 CHARACTERS and carried that window in the state. That works
 * (Δ−122 on the canonical 29) but it is an approximation, and it is expensive:
 * every edge prices a 25-44-character string, and `count-stats.json` measured
 * 285 054 DISTINCT such strings on one lane.
 *
 * The exact state is smaller. Pre-tokenization scans left to right, so appending
 * text cannot change any chunk that is already finished — with one exception
 * that the algebra probe found by RUNNING the identity, not by reading it:
 *
 *     s = "a\na\na\n ", p = "\n"    chunks(s) = [… "a", "\n", " "]
 *                                 chunks(s+p) = [… "a", "\n \n"]
 *
 * The whitespace alternatives are greedy over a whole run and one has a
 * lookahead, so a trailing whitespace run can be re-partitioned AND merged with
 * the whitespace chunk before it. The corrected statement: let k be the start of
 * the last chunk of s that is NOT entirely whitespace (0 if there is none) and
 * let tail(s) = s[k..]. Then for every p
 *
 *     tokens(s + p) = tokens(s) − tokens(tail(s)) + tokens(tail(s) + p)
 *
 * EXACTLY. So the marginal cost of p depends on s only through tail(s): that
 * suffix is the exact Markov state of the cost process. `bpe.tokenTail` returns
 * it with one regex pass and one memo entry, and the DP carries it in the node.
 * Executed evidence: 104 976/104 976 adversarial triples agree with the
 * unaccelerated tokenizer (`bench/x120/receipts/tail-algebra.json`); the first
 * version of the identity failed 45 of them and was corrected before shipping.
 *
 * MEASURED CONSEQUENCE, same 29 frozen wires, balanced arm order
 * (`receipts/speed-state.json`): window state 12 148 tokens in 18 511 ms, exact
 * chunk state 12 137 tokens in 2 617 ms — **7.07× faster and 11 tokens better**,
 * 4 lanes better, 2 worse, 0 inexact. Pricing keys are now a chunk plus a piece
 * (2-14 characters) and the tail memo runs at ~80 % hits, so the long-query
 * population that motivated three earlier speed attempts simply disappears.
 *
 * The beam still matters: nodes are (position, tail) and the beam keeps the
 * cheapest `beam` distinct tails per position. Because tails merge paths that a
 * character window kept apart, the same beam covers more real alternatives.
 * The ladder keeps its (context, beam) shape for compatibility; in chunk mode
 * the context number is ignored and rungs with equal beams run once.
 * `OMEGA_VELTISTOS_WINDOW=1` restores the window draft for A/B.
 *
 * The DP proposes; the tokenizer and the decoder dispose. Admission is always
 * the real whole-message price plus a byte-exact `chironDecode` against the
 * incumbent's own expansion, so a modelling error can cost optimality, never
 * correctness.
 *
 * THREE STAGES, ALL GATED
 * -----------------------------------------------------------------------------
 *   1. BODY  — shortest path over the decoded body, a fixed ladder of
 *      (context, beam) settings, each priced as a complete message.
 *   2. TAPE  — the same shortest path applied to each rule's own value, using
 *      only EARLIER glyphs.  A later glyph would be parsed as a new KEY by
 *      `chironParseTape`, and `chironDecode` rejects forward references, so the
 *      topological restriction is not a heuristic, it is the wire grammar.
 *   3. PRUNE — a rule the new spelling no longer reaches is deleted.  Whole-rule
 *      deletion is ΔΙΑΓΡΑΦΗ's mechanism and is not claimed as new; here it is a
 *      consequence of re-spelling, and reachability is computed through the tape
 *      as well as the body so a list feeding a `×` template is never dropped.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------------------------------------------------------
 * Dictionary INDUCTION was screened (bench/x120/receipts/screen-induct-*.json):
 * proposing new rules for repeated literal spans and pricing each by re-running
 * the global parse admitted ZERO rules on kb-article, email-thread, llm-answer,
 * code-ts and node-help.  The dictionary is not the bottleneck on this corpus;
 * the PARSE is.  That negative result is the reason this module re-spells and
 * never invents.
 *
 * `…` (list) rules are excluded as edges: `chironDecode` gives them no string
 * value and using one in text is malformed.  `×` (repeat) rules ARE included —
 * they have a context-free string value — but their raw spec is never re-spelled,
 * because it is an operand list and not text.
 *
 * GREEDY? NO.
 * -----------
 * Stages 1 and 2 are dynamic programs (optimal within the stated cost model and
 * the beam), not descents.  The ladder is a fixed, finite portfolio; the choice
 * between its rungs is by measured whole-message price.  No randomness, no
 * clock, no encoder call.
 *
 * SOURCE CITATION (HONEST) — AND WHAT IS *NOT* NOVEL.
 * -----------------------------------------------------------------------------
 * The shortest-path formulation of dictionary parsing is classical (Viterbi /
 * DAG shortest path; optimal parsing in LZ schemes; Kudo 2018 subword
 * regularisation uses the same lattice for a different objective).  Two 2026
 * artefacts are CLOSE PRIOR ART and are cited as such, not worked around:
 *   - OptFSST (arXiv:2607.11271, ADMS@VLDB 2026) replaces FSST's longest-match
 *     encoder with a DP that finds the minimum-cost segmentation of a string
 *     over a FIXED symbol table, and proves table selection NP-hard when the
 *     alphabet is part of the input.  "DP over a fixed dictionary" is therefore
 *     NOT claimed as new here.  The differences that matter: OptFSST's edge
 *     costs are additive constants (1 byte per code, 2 per escape) so its state
 *     is a position; BPE costs are contextual, so the state here must carry the
 *     emitted tail and the weights are marginal tokenizer prices.  OptFSST
 *     re-encodes a database column; this re-spells an already-emitted wire whose
 *     dictionary, contract and decoder are fixed by the incumbent.
 *   - adafruit/circuitpython#11369 (Sep 2026) does per-string DP for the fewest
 *     bits and chooses qstr-vs-inline PER OCCURRENCE.  Per-occurrence choice is
 *     therefore also not new in the abstract; X119's ΔΙΓΛΩΣΣΙΑ is the local form
 *     of it and this module is the global form.
 * What is original to X120 is the conjunction, and above all the STATE: the
 * proof that the exact Markov state of a BPE marginal is the suffix from the
 * last non-whitespace pre-tokenizer chunk (not a character window), the DP over
 * (position, that suffix), a ladder of rungs priced as complete messages, and
 * the same parse applied to the TAPE under the wire's own topological
 * restriction, with reachability pruning as a consequence. OptFSST's additive
 * costs need no state at all; that is precisely the difference.  The X120 live-search record
 * (bench/x120/research/sources.md) imports three boundaries and one bug shape:
 *   - "How Far Should Tokenization Go?" (arXiv:2608.18025): a shorter carrier is
 *     not a better downstream representation.  The claim here is carrier tokens
 *     only.
 *   - LTSC (arXiv:2506.00307) Algorithm 2 admits overlapping swaps and is then
 *     not invertible.  A path through this DAG is a partition of the body by
 *     construction, so spans cannot overlap; the gate re-decodes anyway.
 *   - CompactPrompt (arXiv:2510.18043) / BoundlessBPE-class work change the
 *     vocabulary or the tokenizer.  This module changes neither: the tape, the
 *     contract, the script and the decoder are the incumbent's own.
 * Novelty is claimed for that conjunction only, and the claim is downgraded
 * accordingly: no external verifier has reviewed this module.
 *
 * TIME- OR CPU-BOUND?
 * -------------------
 * CPU-bound.  Hard caps: MAX_RULES, MAX_REF_CHARS, MAX_VALUE_LEN, MAX_MATCH,
 * MAX_EDGES (counted across every parse in the call), MAX_PRICED.  No wall clock
 * is read.  The same input yields the same wire on any machine.
 *
 * WHAT IS PROVED, AND WHAT IS NOT
 * -----------------------------------------------------------------------------
 * PROVED and executed on every accepted candidate: the contract prefix is
 * preserved byte-for-byte, `chironDecode(candidate) === chironDecode(incumbent)`,
 * and `countTokens(candidate) < countTokens(incumbent)`.  Optimal within the
 * cost model for the rung that produced it (beam permitting).
 * NOT proved: that a human finds a mixed spelling easy to read.  That is
 * measured by the independent CPython CHIRON reader and the mutation battery,
 * not assumed.
 */
import { countTokens, tokenTail, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_LIST,
  CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode,
} from './chiron';

export interface VeltistosResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  parses: number;
  edges: number;
  priced: number;
  bodyGain: number;
  tapeGain: number;
  pruned: number;
  capped: boolean;
}

export const VELTISTOS_MAX_RULES = 512;
export const VELTISTOS_MAX_REF_CHARS = 60_000;
export const VELTISTOS_MAX_VALUE_LEN = 4_000;
export const VELTISTOS_MAX_MATCH = 12;
export const VELTISTOS_MAX_EDGES = 1_500_000;
export const VELTISTOS_MAX_PRICED = 64;

/** (context characters, beam width). Fixed, ordered, finite. */
export const VELTISTOS_LADDER: ReadonlyArray<readonly [number, number]> = [[24, 8], [0, 1], [32, 16]];

export function veltistosDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_VELTISTOS === '0'
    || process.env?.OMEGA_VELTISTOS === 'false'
    || process.env?.OMEGA_NO_VELTISTOS === '1';
}

/** Ladder override, for the published sweep only. Malformed rungs are dropped. */
function ladder(): Array<readonly [number, number]> {
  const raw = typeof process !== 'undefined' ? process.env?.OMEGA_VELTISTOS_LADDER : undefined;
  if (!raw) return VELTISTOS_LADDER.slice();
  const out: Array<readonly [number, number]> = [];
  for (const part of raw.split(',')) {
    const [c, b] = part.split(':').map(Number);
    if (Number.isFinite(c) && Number.isFinite(b) && c >= 0 && c <= 64 && b >= 1 && b <= 32) out.push([c, b]);
  }
  return out.length ? out : VELTISTOS_LADDER.slice();
}

export interface Entry { g: string; v: string }
/** `ctxTok` is lazy: a state that is pruned before it is expanded never pays for
 *  its own token count. -1 means "not computed yet". */
interface State { ctx: string; ctxTok: number; cost: number; bi: number; bs: number; piece: string }
export interface Budget { edges: number; capped: boolean }

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Edge granularity. `OMEGA_VELTISTOS_COLLAPSE=1` collapses choice-free literal
 *  runs into one edge (faster, more accurate local cost); the default keeps one
 *  edge per character, which the X120 screen measured as the better *proposal*
 *  on this corpus. Both are gated by the same whole-message price. */
/* Read per call, not at module load: a bench probe sets its flags in its own
 * body, which ESM evaluates AFTER every import (the X104 clock.ts lesson). Two
 * X120 A/Bs were void before this was applied to every flag in the module. */
function collapse(): boolean {
  try { return typeof process !== 'undefined' && process.env?.OMEGA_VELTISTOS_COLLAPSE === '1'; }
  catch { return false; }
}

/* X120 — WINDOW STATE vs CHUNK STATE.
 * `OMEGA_VELTISTOS_WINDOW=1` restores the fixed-character-window state used by
 * the first X120 screens. The DEFAULT is the exact state: by the last-chunk
 * theorem in bpe.ts, the marginal cost of the next piece depends on the emitted
 * string only through its final pre-tokenizer chunk, so that chunk IS the state.
 * Two consequences, both measured rather than asserted: pricing keys are short
 * (a chunk plus a piece) instead of 25-44-character windows, and beam dedup
 * merges paths that the window kept apart, so the same beam covers more real
 * alternatives. The (context, beam) ladder keeps its shape; in chunk mode the
 * context number is ignored and rungs with equal beams are run once. */
function windowState(): boolean {
  try { return typeof process !== 'undefined' && process.env?.OMEGA_VELTISTOS_WINDOW === '1'; }
  catch { return false; }
}

interface CState { tail: string; tailTok: number; cost: number; bi: number; bs: number; piece: string }

/** Exact-state shortest path: nodes are (position, last pre-tokenizer chunk). */
function shortestPathChunk(
  ref: string,
  entries: readonly Entry[],
  beam: number,
  seedCtx: string,
  enc: EncodingName,
  budget: Budget,
): string | null {
  const N = ref.length;
  if (N === 0) return '';
  const byFirst = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.v[0]!;
    let list = byFirst.get(k);
    if (!list) { list = []; byFirst.set(k, list); }
    list.push(e);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.v.length - a.v.length || cmp(a.g, b.g));

  const matchAt = new Map<number, Entry[]>();
  const nodeSet = new Set<number>([0, N]);
  for (let i = 0; i < N; i++) {
    const list = byFirst.get(ref[i]!);
    if (!list) continue;
    const ms: Entry[] = [];
    for (const e of list) {
      if (ref.startsWith(e.v, i)) { ms.push(e); nodeSet.add(i + e.v.length); if (ms.length >= VELTISTOS_MAX_MATCH) break; }
    }
    if (ms.length) { matchAt.set(i, ms); nodeSet.add(i); }
  }
  if (!collapse()) { for (let i = 0; i <= N; i++) nodeSet.add(i); }
  const nodes = [...nodeSet].filter(x => x <= N).sort((a, b) => a - b);
  const K = nodes.length;
  const idxOf = new Map<number, number>();
  nodes.forEach((p, i) => idxOf.set(p, i));
  const dp: CState[][] = Array.from({ length: K }, () => []);
  const seed = tokenTail(seedCtx, enc);
  if (seed === null) return null;
  dp[0] = [{ tail: seed.tail, tailTok: seed.tailTok, cost: 0, bi: -1, bs: -1, piece: '' }];

  for (let ni = 0; ni < K; ni++) {
    const arr = dp[ni];
    if (!arr.length) continue;
    arr.sort((a, b) => a.cost - b.cost || cmp(a.tail, b.tail));
    if (arr.length > beam) arr.length = beam;
    const p = nodes[ni]!;
    const next = ni + 1 < K ? nodes[ni + 1]! : N;
    const ms = matchAt.get(p);
    for (let si = 0; si < arr.length; si++) {
      const s = arr[si];
      const emit = (piece: string, j: number): void => {
        if (budget.edges >= VELTISTOS_MAX_EDGES) { budget.capped = true; return; }
        budget.edges++;
        const info = tokenTail(s.tail + piece, enc);
        if (info === null) { budget.capped = true; return; }
        const cost = s.cost + info.tot - s.tailTok;
        const target = dp[idxOf.get(j)!];
        for (let k = 0; k < target.length; k++) {
          if (target[k]!.tail === info.tail) {
            if (cost < target[k]!.cost) target[k] = { tail: info.tail, tailTok: info.tailTok, cost, bi: ni, bs: si, piece };
            return;
          }
        }
        target.push({ tail: info.tail, tailTok: info.tailTok, cost, bi: ni, bs: si, piece });
      };
      if (next > p) emit(ref.slice(p, next), next);
      if (ms) for (const e of ms) emit(e.g, p + e.v.length);
      if (budget.capped) return null;
    }
  }
  const last = dp[K - 1];
  if (!last || !last.length) return null;
  last.sort((a, b) => a.cost - b.cost || cmp(a.tail, b.tail));
  const parts: string[] = [];
  let bi = K - 1, bs = 0;
  while (bi > 0) {
    const s = dp[bi][bs];
    if (!s || s.bi < 0) return null;
    parts.push(s.piece);
    bi = s.bi; bs = s.bs;
  }
  parts.reverse();
  return parts.join('');
}

/** Dispatch: exact chunk state by default, character window on opt-out.
 *  Exported for X125's ΑΝΑΓΡΑΦΗ, which drives the same lattice over the tape
 *  with a different portfolio. */
export function veltistosParse(ref: string, entries: readonly Entry[], ctxLen: number, beam: number,
             seedCtx: string, enc: EncodingName, budget: Budget): string | null {
  return parse(ref, entries, ctxLen, beam, seedCtx, enc, budget);
}
function parse(ref: string, entries: readonly Entry[], ctxLen: number, beam: number,
             seedCtx: string, enc: EncodingName, budget: Budget): string | null {
  return windowState()
    ? shortestPath(ref, entries, ctxLen, beam, seedCtx, enc, budget)
    : shortestPathChunk(ref, entries, beam, seedCtx, enc, budget);
}

/** Rungs actually run: in chunk mode the context width is not a parameter.
 *  Exported so ΑΝΑΓΡΑΦΗ runs the SAME portfolio over the tape that ΒΕΛΤΙΣΤΟΣ
 *  runs over the body. */
export function veltistosRungs() { return rungs(); }
/** Rungs actually run: in chunk mode the context width is not a parameter. */
function rungs(): Array<readonly [number, number]> {
  const all = ladder();
  if (windowState()) return all;
  const seen = new Set<number>();
  const out: Array<readonly [number, number]> = [];
  for (const [c, b] of all) { if (!seen.has(b)) { seen.add(b); out.push([c, b]); } }
  return out;
}

/**
 * Shortest path over the (position, emitted tail) lattice.
 *
 * NODE COMPRESSION. A position where no rule value matches offers no choice: the
 * only edge is "emit the next literal character". A maximal run of such positions
 * is therefore collapsed into ONE literal edge. This is not an approximation:
 * there is no branch inside the run, and pricing the whole run in one call is
 * strictly MORE accurate than pricing it character by character through a
 * truncated context. Nodes are the match starts, every possible landing position
 * of a rule edge, 0 and N. Measured on the canonical 29 this cuts the edge count
 * by ~3x with identical or better token totals.
 *
 * `entries` are the glyph/value pairs legal here; `seedCtx` is the emitted tail
 * that precedes `ref` in the real message (empty for a body, the tape prefix for
 * a rule value).
 */
function shortestPath(
  ref: string,
  entries: readonly Entry[],
  ctxLen: number,
  beam: number,
  seedCtx: string,
  enc: EncodingName,
  budget: Budget,
): string | null {
  const T = (s: string) => countTokens(s, enc);
  const N = ref.length;
  if (N === 0) return '';
  const byFirst = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.v[0]!;
    let list = byFirst.get(k);
    if (!list) { list = []; byFirst.set(k, list); }
    list.push(e);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.v.length - a.v.length || cmp(a.g, b.g));

  const matchAt = new Map<number, Entry[]>();
  const nodeSet = new Set<number>([0, N]);
  for (let i = 0; i < N; i++) {
    const list = byFirst.get(ref[i]!);
    if (!list) continue;
    const ms: Entry[] = [];
    for (const e of list) {
      if (ref.startsWith(e.v, i)) { ms.push(e); nodeSet.add(i + e.v.length); if (ms.length >= VELTISTOS_MAX_MATCH) break; }
    }
    if (ms.length) { matchAt.set(i, ms); nodeSet.add(i); }
  }
  if (!collapse()) { for (let i = 0; i <= N; i++) nodeSet.add(i); }
  const nodes = [...nodeSet].filter(x => x <= N).sort((a, b) => a - b);
  const K = nodes.length;
  const idxOf = new Map<number, number>();
  nodes.forEach((p, i) => idxOf.set(p, i));
  const dp: State[][] = Array.from({ length: K }, () => []);
  dp[0] = [{ ctx: seedCtx, ctxTok: seedCtx ? T(seedCtx) : 0, cost: 0, bi: -1, bs: -1, piece: '' }];

  const push = (j: number, s: State): void => {
    const arr = dp[j];
    for (let k = 0; k < arr.length; k++) {
      if (arr[k].ctx === s.ctx) { if (s.cost < arr[k].cost) arr[k] = s; return; }
    }
    arr.push(s);
  };

  for (let ni = 0; ni < K; ni++) {
    const arr = dp[ni];
    if (!arr.length) continue;
    arr.sort((a, b) => a.cost - b.cost || cmp(a.ctx, b.ctx));
    if (arr.length > beam) arr.length = beam;
    const p = nodes[ni]!;
    const next = ni + 1 < K ? nodes[ni + 1]! : N;
    const ms = matchAt.get(p);
    for (let si = 0; si < arr.length; si++) {
      const s = arr[si];
      const sTok = s.ctxTok >= 0 ? s.ctxTok : (s.ctxTok = s.ctx ? T(s.ctx) : 0);
      const emit = (piece: string, j: number): void => {
        if (budget.edges >= VELTISTOS_MAX_EDGES) { budget.capped = true; return; }
        budget.edges++;
        const joined = s.ctx + piece;
        const cost = s.cost + T(joined) - sTok;
        const ctx = ctxLen > 0 ? joined.slice(-ctxLen) : '';
        push(idxOf.get(j)!, { ctx, ctxTok: -1, cost, bi: ni, bs: si, piece });
      };
      if (next > p) emit(ref.slice(p, next), next);
      if (ms) for (const e of ms) emit(e.g, p + e.v.length);
      if (budget.capped) return null;
    }
  }
  const last = dp[K - 1];
  if (!last || !last.length) return null;
  last.sort((a, b) => a.cost - b.cost || cmp(a.ctx, b.ctx));
  const parts: string[] = [];
  let bi = K - 1, bs = 0;
  while (bi > 0) {
    const s = dp[bi][bs];
    if (!s || s.bi < 0) return null;
    parts.push(s.piece);
    bi = s.bi; bs = s.bs;
  }
  parts.reverse();
  return parts.join('');
}

/** Rules reachable from the body, transitively through rule values. */
function pruneTape(parsed: ReadonlyArray<{ glyph: string; raw: string }>, body: string): string {
  const keys = new Set(parsed.map(p => p.glyph));
  const rawOf = new Map(parsed.map(p => [p.glyph, p.raw]));
  const live = new Set<string>();
  const stack: string[] = [];
  for (const ch of body) if (keys.has(ch) && !live.has(ch)) { live.add(ch); stack.push(ch); }
  while (stack.length) {
    const g = stack.pop()!;
    for (const ch of rawOf.get(g) ?? '') if (keys.has(ch) && !live.has(ch)) { live.add(ch); stack.push(ch); }
  }
  let out = '';
  for (const p of parsed) if (live.has(p.glyph)) out += p.glyph + p.raw;
  return out;
}

export function veltistosEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
): VeltistosResult {
  const no = (notes: string, extra: Partial<VeltistosResult> = {}): VeltistosResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, parses: 0, edges: 0, priced: 0, bodyGain: 0, tapeGain: 0, pruned: 0, capped: false,
    ...extra,
  });
  if (veltistosDisabled()) return no('veltistos: disabled');

  const msg0 = incumbent.message;
  const w = msg0.indexOf(CHIRON_START);
  if (w < 0) return no('veltistos: no CHIRON frame');
  const cut = msg0.indexOf(CHIRON_SEP, w + CHIRON_START.length);
  if (cut < 0) return no('veltistos: no tape separator');
  const prefix = msg0.slice(0, w);
  const tape0 = msg0.slice(w + CHIRON_START.length, cut);
  const body0 = msg0.slice(cut + CHIRON_SEP.length);
  const first = tape0[0];
  if (!first) return no('veltistos: empty tape');
  const script = CHIRON_SCRIPTS.find(s => chironInScript(s, first.codePointAt(0)!));
  if (!script) return no('veltistos: unknown script');
  const parsed0 = chironParseTape(tape0, script);
  if (!parsed0 || parsed0.length === 0) return no('veltistos: malformed tape');
  if (parsed0.length > VELTISTOS_MAX_RULES) return no(`veltistos: ${parsed0.length} rules > cap`);
  const wire0 = msg0.slice(w);
  const ref = chironDecode(wire0);
  if (ref === wire0) return no('veltistos: incumbent does not decode');
  if (ref.length > VELTISTOS_MAX_REF_CHARS) return no(`veltistos: ${ref.length} chars > cap`);
  // A key letter that also occurs in the payload cannot be emitted literally.
  for (const p of parsed0) if (ref.includes(p.glyph)) return no('veltistos: key letter occurs in the payload');

  const budget: Budget = { edges: 0, capped: false };
  let priced = 0, parses = 0;
  const base = countTokens(msg0, enc);
  let bestMsg = msg0, bestTok = base, bestTape = tape0, bestBody = body0;
  let bodyGain = 0, tapeGain = 0;

  const valuesOf = (tape: string, parsed: ReadonlyArray<{ glyph: string; raw: string }>): Map<string, string> => {
    const out = new Map<string, string>();
    for (const p of parsed) {
      if (p.raw.startsWith(CHIRON_LIST)) continue; // a list has no string value
      let v: string;
      try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
      if (!v || v === p.glyph || v.startsWith(CHIRON_START)) continue; // malformed probe
      if (v.length > VELTISTOS_MAX_VALUE_LEN) continue;
      out.set(p.glyph, v);
    }
    return out;
  };
  const entriesOf = (vals: Map<string, string>): Entry[] => [...vals].map(([g, v]) => ({ g, v }));

  /** Price a complete candidate and admit it only on a strict, exact win. */
  const consider = (tape: string, body: string, parsed: ReadonlyArray<{ glyph: string; raw: string }>): boolean => {
    if (priced >= VELTISTOS_MAX_PRICED) { budget.capped = true; return false; }
    const nt = pruneTape(parsed, body);
    const m = prefix + CHIRON_START + nt + CHIRON_SEP + body;
    priced++;
    const t = countTokens(m, enc);
    if (t >= bestTok) return false;
    let ok = false;
    try { ok = chironDecode(m.slice(w)) === ref; } catch { ok = false; }
    if (!ok) return false;
    bestMsg = m; bestTok = t; bestTape = nt; bestBody = body;
    return true;
  };

  // ---- stage 1: BODY -------------------------------------------------------
  const vals0 = valuesOf(tape0, parsed0);
  if (vals0.size === 0) return no('veltistos: no usable rule value');
  const entries0 = entriesOf(vals0);
  const beforeBody = bestTok;
  for (const [ctxLen, beam] of rungs()) {
    if (budget.capped) break;
    const body = parse(ref, entries0, ctxLen, beam, '', enc, budget);
    parses++;
    if (body === null || body === body0) continue;
    consider(tape0, body, parsed0);
  }
  bodyGain = beforeBody - bestTok;

  // ---- stage 2: TAPE -------------------------------------------------------
  const parsed1 = chironParseTape(bestTape, script);
  if (parsed1 && !budget.capped) {
    const vals1 = valuesOf(bestTape, parsed1);
    const earlier: Entry[] = [];
    const newRaw = new Map<string, string>();
    let tapePrefix = '';
    for (const p of parsed1) {
      const v = vals1.get(p.glyph);
      const isOp = p.raw.startsWith(CHIRON_LIST) || p.raw.startsWith('×');
      if (!isOp && v !== undefined && v.length >= 2 && earlier.length && !budget.capped) {
        /* KNOWN APPROXIMATION, kept deliberately: the seed is truncated to 32
         * characters, which can cut the last chunk when a rule value is longer
         * than that. In chunk mode `tokenTail` then returns the tail of the
         * SLICE. This can only mis-price a tape proposal, never corrupt one —
         * `consider` re-prices the whole message and re-decodes it — and passing
         * the full tape prefix instead would change the wire, so it is left for
         * a turn that can re-run the balanced A/B. */
        const seed = (tapePrefix + p.glyph).slice(-32);
        const sp = parse(v, earlier, 24, 4, seed, enc, budget);
        parses++;
        if (sp !== null && sp !== p.raw) newRaw.set(p.glyph, sp);
      }
      if (v !== undefined) earlier.push({ g: p.glyph, v });
      tapePrefix += p.glyph + (newRaw.get(p.glyph) ?? p.raw);
    }
    if (newRaw.size) {
      const beforeTape = bestTok;
      const rebuilt = parsed1.map(p => ({ glyph: p.glyph, raw: newRaw.get(p.glyph) ?? p.raw }));
      const tape2 = rebuilt.map(p => p.glyph + p.raw).join('');
      if (consider(tape2, bestBody, rebuilt)) tapeGain = beforeTape - bestTok;
    }
  }

  if (bestMsg === msg0) {
    return no(`veltistos: ${parses} parse(s), ${budget.edges} edges, ${priced} prices, no win${budget.capped ? ' (capped)' : ''}`,
      { parses, edges: budget.edges, priced, capped: budget.capped });
  }
  const rulesAfter = (chironParseTape(bestTape, script) ?? []).length;
  const pruned = parsed0.length - rulesAfter;
  return {
    applied: true, message: bestMsg, messageTokens: bestTok, decoded: incumbent.decoded,
    notes: `veltistos: ${parses} shortest-path parse(s), ${budget.edges} edges, ${priced} whole-message prices; body −${bodyGain}, tape −${tapeGain}, ${pruned} rule(s) retired; M ${base} -> ${bestTok}${budget.capped ? ' (capped)' : ''}`,
    parses, edges: budget.edges, priced, bodyGain, tapeGain, pruned, capped: budget.capped,
  };
}
