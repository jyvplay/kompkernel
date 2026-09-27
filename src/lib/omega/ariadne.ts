/**
 * ARIADNE — grammar induction in symbol space, with the thread that finds the
 * shortest path through it.
 * =============================================================================
 *
 * WHAT IS ACTUALLY NEW HERE
 * -----------------------------------------------------------------------------
 * ARIADNE emits the CHIRON wire language byte-for-byte: the same `§ tape ¶ body`
 * frame, the same delimiter-free rule tape, the same `×btn` repeat/fill and
 * `…a..b` / `…cX` list operators, and therefore the same generated prose
 * contract. That is deliberate. Everything new is on the ENCODER side, and one
 * of the three new mechanisms is invisible to the reader — it costs zero
 * contract tokens, which under a two-part-MDL objective is the only kind of
 * free lunch there is.
 *
 *   1. SYMBOL-SPACE OBJECTIVE.  Tokenize once. After that every symbol — an
 *      original tokenizer segment or a rule glyph — is exactly one token, so
 *
 *          cost = |body symbols| + Σ_rules (1 + |rule symbols|) + frame
 *
 *      is integer arithmetic. CHIRON re-tokenizes the entire 16 KB wire for
 *      every candidate it considers; ARIADNE never calls the tokenizer inside
 *      the search at all. Measured on bench/train/dts0.txt: the symbol-space
 *      estimate lands within 1 token of the exact count of the rendered wire
 *      (2259 vs 2260), and the search runs ~10x faster.
 *
 *   2. OPTIMAL PARSING INSTEAD OF GREEDY REPLACE-ALL.  CHIRON (and HERMES, and
 *      Re-Pair, and every other greedy grammar compressor in this repository)
 *      picks one phrase and substitutes EVERY occurrence, so two phrases that
 *      overlap can never coexist and the first one admitted destroys the sites
 *      of the second. ARIADNE fixes a dictionary and then parses by shortest
 *      path over symbol positions, with a Lagrangian price per dictionary entry
 *      iterated against realized usage, and a fixed point that drops entries
 *      that stopped paying. Because the objective is integer and cheap, the
 *      parse is re-run thousands of times inside a local search over the rule
 *      set (add / drop / swap), which is simply unaffordable when every probe
 *      costs a full re-tokenization.
 *
 *   3. TOKENIZER-AWARE GLYPH ASSIGNMENT.  Every codec here treats "which glyph
 *      names which rule" as arbitrary. It is not. o200k contains multi-CHARACTER
 *      single tokens inside one script, and the pre-tokenizer keeps a run of
 *      same-script characters in one chunk, so BPE merges inside it. Scanned
 *      over the whole 200 006-entry vocabulary (bench/tmp/vocab.ts):
 *
 *          script      1-char   2-char   3-char   4-char   5+char
 *          cyrillic      122      823     1896     1329     1283
 *          arabic        128      771     1187      503      125
 *          hangul        677      390       41       12        2
 *          cjk          2517     2415      389      321      144
 *
 *      A run of adjacent references is therefore NOT k tokens for k references:
 *      with a good assignment it is fewer. Measured: random runs over the full
 *      Cyrillic alphabet cost 0.954 tokens/char, and restricting to the 64
 *      best-connected characters costs 0.864. ARIADNE chooses the script by
 *      merge density (subject to pool size and payload collisions) and then
 *      hill-climbs the rule→glyph permutation against the live tokenizer.
 *      The reader is unaffected: a glyph is a glyph.
 *
 * WHAT IS BORROWED, EXPLICITLY
 * -----------------------------------------------------------------------------
 * The structural pass (repeat/fill blocks over discovered line units, column
 * lists, integer ranges, template widening, column splitting) is CHIRON's, used
 * through its exported `chironFindBlocks`. The decoder, the contract compiler
 * and the three independent readers are CHIRON's. Re-implementing them would
 * add risk and zero information; sharing them means every ARIADNE wire is
 * validated by a reader written from the prose and by a CPython reader in a
 * separate process.
 *
 * WHAT THIS DOES NOT DO
 * -----------------------------------------------------------------------------
 * It does not beat the o200k density wall on English prose, and it says so: for
 * a document whose distinct tokens are already one token each, a 1-token glyph
 * can only pay on multi-token spans that repeat, and in a 2 000-token English
 * document there are few. The measured optimal-parse floor for
 * bench/holdout/gh-prose.txt with a FREE dictionary is 1415 tokens against an
 * identity of 1934; charge the dictionary and the optimum is worse than
 * identity. That lane is at its mechanism limit, not at its search limit.
 * =============================================================================
 */

import { countTokens, tokenStrings, decodeIds, type EncodingName } from './bpe';
import {
  chironInScript,
  CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST,
  chironDecode, chironDecoderPrompt, chironOpsUsed, chironFindBlocks,
  CHIRON_SCRIPTS, type ChironScript, type BlockCandidate, chironSeparators,
} from './chiron';

/* ---------------------------------------------------------------------------
 * 1. SCRIPT POOLS, RANKED BY MEASURED MERGE DENSITY
 *
 *    `pairs` is the number of 2-character strings over that script's usable
 *    1-token alphabet that are THEMSELVES a single o200k token — i.e. the number
 *    of adjacent reference pairs that can be made free. Scanned once, lazily.
 * ------------------------------------------------------------------------- */
export interface ScriptPool {
  script: ChironScript;
  chars: string[];
  pairs: Set<string>;
  degree: Map<string, number>;
  /** n -> the n-character strings over this alphabet that are ONE o200k token.
   *  Cyrillic has 823 of length 2, 1896 of length 3, 1329 of length 4 and 1283
   *  of length 5+: a run of five adjacent references can cost one token. */
  ngrams: Map<number, string[]>;
}
const poolCache = new Map<string, ScriptPool>();
const vocabCache = new Map<EncodingName, Map<string, string[]>>();

/** Upper bound on token ids per encoding (o200k_base = 200006, cl100k = 100277). */
const VOCAB_LIMIT: Record<string, number> = { o200k_base: 200006, cl100k_base: 100277 };

/**
 * One pass over the ENTIRE vocabulary, bucketed by "pure single-script run".
 * Sampling the pair graph by brute-force probing (the first revision did this,
 * capped at 200 characters) misses most of the graph for the big syllabaries;
 * the vocabulary already contains the answer exactly.
 */
function vocabByScript(enc: EncodingName): Map<string, string[]> {
  const hit = vocabCache.get(enc);
  if (hit) return hit;
  const out = new Map<string, string[]>();
  for (const sc of CHIRON_SCRIPTS) out.set(sc.name, []);
  const limit = VOCAB_LIMIT[enc] ?? 100277;
  for (let id = 0; id < limit; id++) {
    let str: string;
    try { str = decodeIds([id], enc); } catch { continue; }
    if (!str) continue;
    let cps: number[];
    try { cps = [...str].map(c => c.codePointAt(0)!); } catch { continue; }
    for (const sc of CHIRON_SCRIPTS) {
      let all = true;
      for (const c of cps) if (!chironInScript(sc, c)) { all = false; break; }
      if (all) { out.get(sc.name)!.push(str); break; }
    }
  }
  vocabCache.set(enc, out);
  return out;
}

export function scriptPool(script: ChironScript, enc: EncodingName): ScriptPool {
  const key = `${script.name}:${enc}`;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const all = vocabByScript(enc).get(script.name) ?? [];
  const chars: string[] = [];
  const oneSet = new Set<string>();
  for (const s of all) if ([...s].length === 1) { chars.push(s); oneSet.add(s); }
  const pairs = new Set<string>();
  const degree = new Map<string, number>();
  for (const s of all) {
    const a = [...s];
    if (a.length !== 2) continue;
    if (!oneSet.has(a[0]) || !oneSet.has(a[1])) continue;
    pairs.add(s);
    degree.set(a[0], (degree.get(a[0]) ?? 0) + 1);
    degree.set(a[1], (degree.get(a[1]) ?? 0) + 1);
  }
  const ngrams = new Map<number, string[]>();
  for (const s2 of all) {
    const a = [...s2];
    if (a.length < 2 || a.length > 6) continue;
    if (!a.every(c => oneSet.has(c))) continue;
    if (new Set(a).size !== a.length) continue;   // assignment is injective
    if (!ngrams.has(a.length)) ngrams.set(a.length, []);
    ngrams.get(a.length)!.push(s2);
  }
  const out: ScriptPool = { script, chars, pairs, degree, ngrams };
  poolCache.set(key, out);
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. SYMBOL-SPACE GRAMMAR
 * ------------------------------------------------------------------------- */

type SeqKind = 'macro' | 'template';

export interface SeqRule { id: number; kind: SeqKind; body: number[] }
export interface ListRule { id: number; payload: string }               // rendered as `…payload`
export interface BlockRule { id: number; blank: string; tpl: number | string; count: number; lists: number[] }

export interface Grammar {
  /** literal text of each symbol; rule symbols carry '' */
  symText: string[];
  /** symbol id -> sequence-rule index */
  seqOf: Map<number, number>;
  /** symbol id -> block-rule index */
  blockOf: Map<number, number>;
  seq: SeqRule[];
  blocks: BlockRule[];
  lists: ListRule[];
  main: number[];
}

export function grammarCost(g: Grammar, enc: EncodingName): number {
  let c = g.main.length + 2;
  for (const r of g.seq) if (r.body.length) c += 1 + r.body.length;
  for (const b of g.blocks) c += 2 + 1 + String(b.count).length + b.lists.length + (typeof b.tpl === 'string' ? 1 : 1);
  for (const l of g.lists) c += 1 + countTokens(CHIRON_LIST + l.payload, enc);
  return c;
}

interface MineOpts { maxSpan: number; topK: number; priceIters: number; fixIters: number }

/** All repeated symbol spans, ranked by the exact integer net gain. */
/**
 * CANDIDATE GENERATION BY SUFFIX AUTOMATON (maximal repeats).
 *
 * The previous implementation swept every span length 2..maxSpan over every
 * position and hashed a freshly built string key for each — O(n * maxSpan)
 * string concatenations, re-run once per level AND once per greedy-add round,
 * which is where the encoder actually spent its time.
 *
 * A suffix automaton's states are the right-equivalence classes of substrings,
 * so a state with occurrence count >= 2 is exactly a maximal repeat, and the
 * whole candidate set falls out in O(n) with integer operations. Measured
 * (bench/tmp/prof.ts) on the same symbol sequences:
 *
 *     lane      sweep(ms)  #cand   automaton(ms)  #cand   speedup  top-net
 *     dts0            300   8000               8   1616     37.5x  145 = 145
 *     doc11           198   3868               5   1021     39.6x   76 =  76
 *     gh-prose        129    391               3    141     43.0x   20 =  20
 *     code-ts          34    729               9    321      3.8x   47 =  47
 *
 * Identical best candidate, ~40x cheaper, and FEWER candidates because only
 * maximal repeats survive — which is also the MR-RePair result (Furuya et al.,
 * Algorithms 13(4):103, 2020): replacing maximal repeats beats replacing
 * frequent pairs.
 */
function mineSpans(seqs: number[][], o: MineOpts) {
  // concatenate the sequences with unique negative separators so no candidate
  // can straddle two of them
  const cat: number[] = [];
  let sepId = -1;
  for (const seq of seqs) { for (const x of seq) cat.push(x); cat.push(sepId--); }
  const n = cat.length;
  const out: Array<{ key: string; ids: number[]; c: number; net: number }> = [];
  if (n < 3) return out;

  const CAP = 2 * n + 5;
  const len = new Int32Array(CAP);
  const link = new Int32Array(CAP).fill(-1);
  const cnt = new Int32Array(CAP);
  const firstEnd = new Int32Array(CAP).fill(-1);
  const next: Array<Map<number, number>> = new Array(CAP);
  next[0] = new Map();
  let sz = 1, last = 0;
  for (let i = 0; i < n; i++) {
    const c = cat[i];
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
  // counting sort states by len, then propagate occurrence counts up suffix links
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
    const L = Math.min(len[v], o.maxSpan);
    if (L < 2) continue;
    const net = c * (L - 1) - L - 1;
    if (net <= 0) continue;
    const end = firstEnd[v];
    const st = end - L + 1;
    if (st < 0) continue;
    let ok = true;
    for (let j = st; j <= end; j++) if (cat[j] < 0) { ok = false; break; }
    if (!ok) continue;
    const ids = cat.slice(st, end + 1);
    const key = ids.join(',') + ',';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, ids, c, net });
  }
  out.sort((a, b) => b.net - a.net);
  return out.slice(0, o.topK);
}

interface ParseIndex { starts: Array<Array<Array<[number, number]>>> }

/**
 * Occurrence index by Aho-Corasick over integer symbols.
 *
 * The previous version rebuilt a string key for every (position, length) pair
 * and looked it up in a map: O(n * maxSpan) concatenations per level. A single
 * automaton pass reports every candidate occurrence in O(n + matches), exactly,
 * with no hashing and no collisions.
 */
function buildIndex(seqs: number[][], keep: Array<{ key: string; ids: number[] }>, maxSpan: number): ParseIndex {
  void maxSpan;
  const goto_: Array<Map<number, number>> = [new Map()];
  const fail: number[] = [0];
  const term: Array<number[]> = [[]];     // candidate ids ending exactly here
  const outLink: number[] = [-1];         // nearest ancestor-by-fail with output
  for (let id = 0; id < keep.length; id++) {
    let node = 0;
    for (const sym of keep[id].ids) {
      let nx = goto_[node].get(sym);
      if (nx === undefined) {
        nx = goto_.length;
        goto_.push(new Map()); fail.push(0); term.push([]); outLink.push(-1);
        goto_[node].set(sym, nx);
      }
      node = nx;
    }
    term[node].push(id);
  }
  // BFS to build failure and output links
  const queue: number[] = [];
  for (const [, v] of goto_[0]) { fail[v] = 0; queue.push(v); }
  for (let qi = 0; qi < queue.length; qi++) {
    const u = queue[qi];
    outLink[u] = term[fail[u]].length ? fail[u] : outLink[fail[u]];
    for (const [sym, v] of goto_[u]) {
      let f = fail[u];
      while (f !== 0 && !goto_[f].has(sym)) f = fail[f];
      const cand = goto_[f].get(sym);
      fail[v] = (cand !== undefined && cand !== v) ? cand : 0;
      queue.push(v);
    }
  }
  const lenOf = keep.map(k => k.ids.length);
  const starts = seqs.map(seq => {
    const n = seq.length;
    const at: Array<Array<[number, number]>> = Array.from({ length: n }, () => []);
    let node = 0;
    for (let i = 0; i < n; i++) {
      const sym = seq[i];
      while (node !== 0 && !goto_[node].has(sym)) node = fail[node];
      node = goto_[node].get(sym) ?? 0;
      let out: number = node;
      while (out !== -1) {
        if (term[out].length) {
          for (const id of term[out]) {
            const L = lenOf[id];
            const st = i - L + 1;
            if (st >= 0) at[st].push([id, L]);
          }
        }
        out = outLink[out];
      }
    }
    return at;
  });
  return { starts };
}

/** Shortest-path parse of every sequence under a per-entry price. */
function parseAll(seqs: number[][], idx: ParseIndex, price: Float64Array, live: Set<number> | null) {
  const picks: Array<Array<[number, number]>> = [];
  const uses = new Float64Array(price.length);
  let total = 0;
  for (let s = 0; s < seqs.length; s++) {
    const seq = seqs[s];
    const n = seq.length;
    const at = idx.starts[s];
    const dp = new Float64Array(n + 1).fill(Infinity);
    const cI = new Int32Array(n + 1).fill(-1);
    const cL = new Int32Array(n + 1).fill(1);
    dp[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
      let b = dp[i + 1] + 1, bi = -1, bl = 1;
      const row = at[i];
      for (let t = 0; t < row.length; t++) {
        const id = row[t][0];
        if (live && !live.has(id)) continue;
        const p = price[id];
        if (!isFinite(p)) continue;
        const v = dp[i + row[t][1]] + 1 + p;
        if (v < b) { b = v; bi = id; bl = row[t][1]; }
      }
      dp[i] = b; cI[i] = bi; cL[i] = bl;
    }
    const p: Array<[number, number]> = [];
    for (let i = 0; i < n;) { p.push([cI[i], cL[i]]); if (cI[i] >= 0) uses[cI[i]]++; i += cL[i]; }
    picks.push(p);
    total += dp[0];
  }
  return { picks, uses, total };
}

/* ---------------------------------------------------------------------------
 * 3. RENDERING — topological order, then a tokenizer-scored glyph assignment
 * ------------------------------------------------------------------------- */

export interface RenderPlan {
  order: number[];                 // symbol ids of rules, topologically sorted
  deps: Map<number, number[]>;
}

export function planOrder(g: Grammar): RenderPlan | null {
  const order: number[] = [];
  const state = new Map<number, number>();
  const deps = new Map<number, number[]>();
  const depsOf = (sid: number): number[] => {
    const si = g.seqOf.get(sid);
    if (si !== undefined) return g.seq[si].body.filter(s => g.seqOf.has(s) || g.blockOf.has(s));
    const bi = g.blockOf.get(sid);
    if (bi !== undefined) {
      const b = g.blocks[bi];
      const out: number[] = [];
      if (typeof b.tpl === 'number') out.push(b.tpl);
      return out;
    }
    return [];
  };
  let ok = true;
  const visit = (sid: number) => {
    const st = state.get(sid) ?? 0;
    if (st === 2) return;
    if (st === 1) { ok = false; return; }
    state.set(sid, 1);
    const d = depsOf(sid);
    deps.set(sid, d);
    for (const x of d) visit(x);
    state.set(sid, 2);
    order.push(sid);
  };
  for (const sid of g.seqOf.keys()) visit(sid);
  for (const sid of g.blockOf.keys()) visit(sid);
  if (!ok) return null;
  return { order, deps };
}

interface Rendered { wire: string; tokens: number }

/**
 * The wire as a list of ATOMS: fixed strings, and references that still need a
 * glyph. Splitting it this way is what makes the assignment search affordable —
 * changing an assignment only changes the maximal RUNS of adjacent references,
 * and a same-script run is its own pre-tokenizer chunk (verified: 400/400
 * two-character tokens keep costing one token between ASCII neighbours), so a
 * probe re-tokenizes a few hundred characters instead of sixteen kilobytes.
 */
export type Atom = string | { r: number };          // r: key into the glyph map

export function buildAtoms(g: Grammar, plan: RenderPlan): Atom[] {
  const out: Atom[] = [CHIRON_START];
  const LIST_BASE = -1000000;                 // list rule ids live in a separate space
  for (const l of g.lists) { out.push({ r: LIST_BASE - l.id }); out.push(CHIRON_LIST + l.payload); }
  for (const sid of plan.order) {
    out.push({ r: sid });
    const si = g.seqOf.get(sid);
    if (si !== undefined) {
      for (const s of g.seq[si].body) {
        if (g.seqOf.has(s) || g.blockOf.has(s)) out.push({ r: s });
        else out.push(g.symText[s]);
      }
      continue;
    }
    const b = g.blocks[g.blockOf.get(sid)!];
    out.push(CHIRON_REP + b.blank);
    if (typeof b.tpl === 'number') out.push({ r: b.tpl }); else out.push(b.tpl);
    out.push(String(b.count));
    for (const l of b.lists) out.push({ r: LIST_BASE - l });
  }
  out.push(CHIRON_SEP);
  for (const s of g.main) {
    if (g.seqOf.has(s) || g.blockOf.has(s)) out.push({ r: s });
    else out.push(g.symText[s]);
  }
  // coalesce adjacent fixed strings so run detection is exact
  const packed: Atom[] = [];
  for (const a of out) {
    if (typeof a === 'string') {
      if (packed.length && typeof packed[packed.length - 1] === 'string') packed[packed.length - 1] = (packed[packed.length - 1] as string) + a;
      else packed.push(a);
    } else packed.push(a);
  }
  return packed;
}

/** Maximal runs of reference atoms; everything else is assignment-invariant. */
export function atomRuns(atoms: Atom[]): number[][] {
  const runs: number[][] = [];
  let cur: number[] = [];
  for (const a of atoms) {
    if (typeof a === 'string') { if (cur.length) { runs.push(cur); cur = []; } }
    else cur.push(a.r);
  }
  if (cur.length) runs.push(cur);
  return runs;
}

export function materialise(atoms: Atom[], assign: Map<number, string>): string | null {
  let out = '';
  for (const a of atoms) {
    if (typeof a === 'string') out += a;
    else { const g = assign.get(a.r); if (g === undefined) return null; out += g; }
  }
  return out;
}

/** Fast, assignment-sensitive part of the cost. */
export interface PreparedRuns { pats: number[][]; mult: Int32Array }

/**
 * Collapse identical reference sequences and carry a multiplicity.
 *
 * The assignment objective is dominated by the NUMBER of countTokens calls, not
 * their length, and identical runs recur constantly — the same two function
 * words beside each other, over and over. Measured on holdout/license.txt the
 * distinct-pattern count is a fraction of the run count, and the objective is
 * unchanged because it is a plain sum.
 */
export function prepareRuns(runs: number[][]): PreparedRuns {
  const at = new Map<string, number>();
  const pats: number[][] = [];
  const mult: number[] = [];
  for (const r of runs) {
    const k = r.join(',');
    const i = at.get(k);
    if (i === undefined) { at.set(k, pats.length); pats.push(r); mult.push(1); }
    else mult[i]++;
  }
  return { pats, mult: Int32Array.from(mult) };
}

export function runCostPrepared(p: PreparedRuns, assign: Map<number, string>, enc: EncodingName, cache: Map<string, number>): number {
  let t = 0;
  for (let i = 0; i < p.pats.length; i++) {
    const run = p.pats[i];
    let s = '';
    for (const r of run) s += assign.get(r)!;
    let v = cache.get(s);
    if (v === undefined) { v = countTokens(s, enc); cache.set(s, v); }
    t += v * p.mult[i];
  }
  return t;
}

export function runCost(runs: number[][], assign: Map<number, string>, enc: EncodingName, cache: Map<string, number>): number {
  let t = 0;
  for (const run of runs) {
    let s = '';
    for (const r of run) s += assign.get(r)!;
    let v = cache.get(s);
    if (v === undefined) { v = countTokens(s, enc); cache.set(s, v); }
    t += v;
  }
  return t;
}

/* ---------------------------------------------------------------------------
 * 4. RESULT
 * ------------------------------------------------------------------------- */
export interface AriadneResult {
  codec: 'ariadne';
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
  blocks: number;
  lists: number;
  script: string;
  ops: string[];
  ms: number;
  mode: 'ariadne' | 'raw' | 'forced-wrap';
  notes: string;
  /** diagnostics for the bench */
  estimate: number;
  assignmentGain: number;
  searchGain: number;
}

export interface AriadneOptions {
  budgetMs?: number;
  maxSpan?: number;
  topK?: number;
  levels?: number;
  /** disable the tokenizer-aware glyph assignment (ablation) */
  noAssign?: boolean;
  /** allow the pooled 14-script alphabet (SIBYL uses it; ARIADNE stays fixed) */
  allowPolyglot?: boolean;
  /** disable the rule-set local search (ablation) */
  noSearch?: boolean;
  /** disable the CHIRON structural block pass (ablation) */
  noBlocks?: boolean;
  /** force a script by name (ablation) */
  script?: string;
  sep?: string;
}

function rawResult(text: string, enc: EncodingName, started: number): AriadneResult {
  const inTokens = countTokens(text, enc);
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const wire = forced ? CHIRON_START + CHIRON_SEP + text : text;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'ariadne', wire, decoded: chironDecode(wire), exact: chironDecode(wire) === text,
    inTokens, outTokens: forced ? countTokens(wire, enc) : inTokens, messageTokens,
    contractTokens: messageTokens - (forced ? countTokens(wire, enc) : inTokens),
    decoderPrompt: prompt, savingsPct: 0, rules: 0, blocks: 0, lists: 0, script: 'none', ops: [],
    ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload is itself a decodable program; exact 2-token wrapper' : 'identity: no framing pays here',
    estimate: inTokens, assignmentGain: 0, searchGain: 0,
  };
}

/* ---------------------------------------------------------------------------
 * 5. ENCODER
 * ------------------------------------------------------------------------- */

export interface BuildOut { g: Grammar; plan: RenderPlan; listGlyph: Map<number, string>; glyph: Map<number, string>; wire: string; tokens: number; estimate: number; scriptName: string; assignmentGain: number; searchGain: number }

export function buildOn(text: string, enc: EncodingName, sep: string, opts: Required<Omit<AriadneOptions, 'script' | 'sep'>> & { script?: string }, deadline: number): BuildOut | null {
  /* ---- 5a. structural pass (CHIRON's, reused) ---- */
  const BLANKS = ['@', '·', '¤', '†', '‡', '»', '«', '¦', '¬', '±', '°', 'µ', '★', '◆', '\u0001', '\u0002'];
  const blank = BLANKS.find(c => countTokens(c, enc) === 1 && !text.includes(c));

  const symText: string[] = [];
  const symIdx = new Map<string, number>();
  const idOf = (s: string) => { let i = symIdx.get(s); if (i === undefined) { i = symText.length; symText.push(s); symIdx.set(s, i); } return i; };
  const newOpaque = () => { const i = symText.length; symText.push(''); return i; };

  const g: Grammar = { symText, seqOf: new Map(), blockOf: new Map(), seq: [], blocks: [], lists: [], main: [] };
  let nextId = 0;
  const addSeq = (kind: SeqKind, body: number[]) => { const sid = newOpaque(); g.seqOf.set(sid, g.seq.length); g.seq.push({ id: nextId++, kind, body }); return sid; };

  const chunks: Array<{ kind: 'text'; s: string } | { kind: 'sym'; id: number }> = [];
  let nBlocks = 0;
  const chosen: BlockCandidate[] = (!opts.noBlocks && blank) ? chironFindBlocks(text, blank, sep, enc, Math.min(deadline, Date.now() + Math.max(400, opts.budgetMs * 0.2))) : [];
  if (chosen.length) {
    const lines = text.split(sep);
    const tplBySig = new Map<string, number>();
    const listBySig = new Map<string, number>();
    let cursor = 0;
    for (const c of chosen) {
      if (cursor < c.startLine) chunks.push({ kind: 'text', s: lines.slice(cursor, c.startLine).join(sep) + sep });
      const tplText = c.anchors.join(blank!);
      let tplSid = tplBySig.get(tplText);
      if (tplSid === undefined) {
        const segs = tokenStrings(tplText, enc).map(t => t.s);
        if (segs.join('') !== tplText) { chunks.push({ kind: 'text', s: lines.slice(c.startLine, c.endLine).join(sep) + sep }); cursor = c.endLine; continue; }
        tplSid = addSeq('template', segs.map(idOf));
        tplBySig.set(tplText, tplSid);
      }
      const listIds: number[] = [];
      let ok = true;
      for (const col of c.columns) {
        const payload = listPayload(col, enc);
        if (payload === null) { ok = false; break; }
        let lid = listBySig.get(payload);
        if (lid === undefined) { lid = nextId++; g.lists.push({ id: lid, payload }); listBySig.set(payload, lid); }
        listIds.push(lid);
      }
      if (!ok) { chunks.push({ kind: 'text', s: lines.slice(c.startLine, c.endLine).join(sep) + sep }); cursor = c.endLine; continue; }
      const bsid = newOpaque();
      g.blockOf.set(bsid, g.blocks.length);
      g.blocks.push({ id: nextId++, blank: blank!, tpl: tplSid, count: c.units, lists: listIds });
      chunks.push({ kind: 'sym', id: bsid });
      nBlocks++;
      cursor = c.endLine;
    }
    chunks.push({ kind: 'text', s: lines.slice(cursor).join(sep) });
  } else {
    chunks.push({ kind: 'text', s: text });
  }

  /* ---- 5b. character runs as one-character `×` blocks ---- */
  if (!opts.noBlocks && blank) {
    const out: typeof chunks = [];
    for (const ch of chunks) {
      if (ch.kind !== 'text') { out.push(ch); continue; }
      const re = /([^\s])\1{7,}/gu;
      let at = 0; let m: RegExpExecArray | null; let cur = '';
      while ((m = re.exec(ch.s))) {
        const c0 = m[1];
        if (c0 === CHIRON_SEP || c0 === CHIRON_START) continue;
        const n = m[0].length;
        if (countTokens(m[0], enc) <= countTokens(CHIRON_REP + blank + c0 + String(n), enc) + 2) continue;
        cur += ch.s.slice(at, m.index);
        if (cur) { out.push({ kind: 'text', s: cur }); cur = ''; }
        const bsid = newOpaque();
        g.blockOf.set(bsid, g.blocks.length);
        g.blocks.push({ id: nextId++, blank, tpl: c0, count: n, lists: [] });
        out.push({ kind: 'sym', id: bsid });
        nBlocks++;
        at = m.index + m[0].length;
      }
      cur += ch.s.slice(at);
      if (cur) out.push({ kind: 'text', s: cur });
    }
    chunks.length = 0; chunks.push(...out);
  }

  /* ---- 5c. build the main symbol sequence ---- */
  for (const ch of chunks) {
    if (ch.kind === 'sym') { g.main.push(ch.id); continue; }
    if (!ch.s) continue;
    const segs = tokenStrings(ch.s, enc).map(t => t.s);
    if (segs.join('') !== ch.s) return null;
    for (const s of segs) g.main.push(idOf(s));
  }

  /* ---- 5d. hierarchical optimal parsing ---- */
  const mineable = () => {
    const seqs: number[][] = [g.main];
    const owners: number[] = [-1];
    for (let i = 0; i < g.seq.length; i++) { seqs.push(g.seq[i].body); owners.push(i); }
    return { seqs, owners };
  };
  const estBefore = grammarCost(g, enc);

  for (let level = 0; level < opts.levels && Date.now() < deadline; level++) {
    const { seqs, owners } = mineable();
    const keep = mineSpans(seqs, { maxSpan: opts.maxSpan, topK: opts.topK, priceIters: opts.levels, fixIters: 6 });
    if (!keep.length) break;
    const idx = buildIndex(seqs, keep, opts.maxSpan);

    // Lagrangian pricing, OPTIMISTIC init (a pessimistic cold start kills the
    // search outright — measured: 45 rules instead of 136 on dts0)
    let uses = new Float64Array(keep.length);
    keep.forEach((c, i) => { uses[i] = c.c; });
    for (let it = 0; it < 6 && Date.now() < deadline; it++) {
      const price = new Float64Array(keep.length);
      for (let i = 0; i < keep.length; i++) price[i] = (1 + keep[i].ids.length) / Math.max(0.5, uses[i]);
      uses = parseAll(seqs, idx, price, null).uses;
    }
    let live = new Set<number>();
    for (let i = 0; i < keep.length; i++) if (uses[i] >= 2) live.add(i);
    let picks: Array<Array<[number, number]>> = [];
    const free = new Float64Array(keep.length);
    for (let round = 0; round < 6 && live.size; round++) {
      const r = parseAll(seqs, idx, free, live);
      picks = r.picks;
      const next = new Set<number>();
      for (const id of live) {
        const u = r.uses[id]; const L = keep[id].ids.length;
        if (u >= 2 && u * (L - 1) - L - 1 > 0) next.add(id);
      }
      if (next.size === live.size) { live = next; break; }
      live = next;
    }
    if (!live.size) break;

    const madeSid = new Map<number, number>();
    for (const id of live) madeSid.set(id, addSeq('macro', keep[id].ids.slice()));
    const rewrite = (seq: number[], p: Array<[number, number]>) => {
      const out: number[] = [];
      let i = 0;
      for (const [id, L] of p) {
        if (id >= 0 && madeSid.has(id)) out.push(madeSid.get(id)!);
        else for (let j = i; j < i + L; j++) out.push(seq[j]);
        i += L;
      }
      return out;
    };
    const newMain = rewrite(seqs[0], picks[0]);
    const newBodies: Array<[number, number[]]> = [];
    for (let s = 1; s < seqs.length; s++) newBodies.push([owners[s], rewrite(seqs[s], picks[s])]);
    g.main = newMain;
    for (const [oi, body] of newBodies) g.seq[oi].body = body;
  }

  /* ---- 5e. inline rules that stopped paying ---- */
  for (let pass = 0; pass < 10; pass++) {
    const uc = new Map<number, number>();
    const count = (seq: number[]) => { for (const s of seq) if (g.seqOf.has(s)) uc.set(s, (uc.get(s) ?? 0) + 1); };
    count(g.main); for (const r of g.seq) count(r.body);
    let changed = false;
    for (const [sid, si] of [...g.seqOf]) {
      if (g.seq[si].kind === 'template') continue;    // referenced by a block
      const u = uc.get(sid) ?? 0;
      const L = g.seq[si].body.length;
      if (u >= 2 && u * (L - 1) - L - 1 > 0) continue;
      const repl = g.seq[si].body;
      const sub = (seq: number[]) => { const o: number[] = []; for (const s of seq) { if (s === sid) o.push(...repl); else o.push(s); } return o; };
      g.main = sub(g.main);
      for (let i = 0; i < g.seq.length; i++) if (i !== si) g.seq[i].body = sub(g.seq[i].body);
      g.seq[si].body = [];
      g.seqOf.delete(sid);
      changed = true;
    }
    if (!changed) break;
  }
  const estAfterGrammar = grammarCost(g, enc);

  /* ---- 5f. greedy-add refinement, optimal re-parse, local search ---- */
  let searchGain = 0;
  if (!opts.noSearch && Date.now() < deadline) {
    const before = grammarCost(g, enc);
    greedyAdd(g, enc, opts.maxSpan, opts.topK, deadline);
    reparse(g, enc, opts.maxSpan, deadline);
    greedyAdd(g, enc, opts.maxSpan, opts.topK, deadline);
    localSearch(g, enc, opts, deadline);
    searchGain = before - grammarCost(g, enc);
  }

  /* ---- 5g. render, then optimise the glyph assignment ---- */
  return renderBest(g, text, enc, { script: opts.script, noAssign: opts.noAssign, budgetMs: opts.budgetMs, allowPolyglot: opts.allowPolyglot }, deadline, estAfterGrammar, searchGain, estBefore);
}

export interface AssignOpts { script?: string; noAssign: boolean; budgetMs: number; scriptTries?: number; probeScale?: number; allowPolyglot?: boolean }

/**
 * Render a finished grammar and choose the rule->glyph assignment.
 *
 * Separated out because SIBYL re-runs exactly this step after adding
 * single-token rules: the entire value of those rules is a tokenizer effect
 * that only becomes visible once the wire is materialised and counted.
 */
export function renderBest(
  g: Grammar, text: string, enc: EncodingName, o: AssignOpts,
  deadline: number, estAfterGrammar: number, searchGain: number, estBefore = 0,
): BuildOut | null {
  const plan = planOrder(g);
  if (!plan) return null;
  const atoms = buildAtoms(g, plan);
  const runs = atomRuns(atoms);
  const prepRuns = prepareRuns(runs);
  const refs = new Set<number>();
  for (const a of atoms) if (typeof a !== 'string') refs.add(a.r);
  const needed = refs.size;
  const refList = [...refs];

  // What the assignment can actually influence: ordered pairs inside runs.
  const wanted = new Map<string, number>();
  for (const run of runs) {
    for (let i = 0; i + 1 < run.length; i++) {
      const k = run[i] + '\u0000' + run[i + 1];
      wanted.set(k, (wanted.get(k) ?? 0) + 1);
    }
  }
  const hotPairs = [...wanted.entries()].sort((x, y) => y[1] - x[1])
    .map(([k, c]) => { const [u, v] = k.split('\u0000').map(Number); return { u, v, c }; });

  // Hot n-grams, n = 3..5. A pair that merges saves one token; a quadruple that
  // merges saves three. The construction below only reasons about pairs, so the
  // hill-climb needs an explicit n-gram move or it will never find them.
  const wantedN = new Map<number, Map<string, number>>();
  for (let n = 3; n <= 5; n++) wantedN.set(n, new Map());
  for (const run of runs) {
    for (let n = 3; n <= 5; n++) {
      const m = wantedN.get(n)!;
      for (let i = 0; i + n <= run.length; i++) {
        const seg = run.slice(i, i + n);
        if (new Set(seg).size !== n) continue;
        const k = seg.join('\u0000');
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
  }
  const hotN: Array<{ ids: number[]; c: number }> = [];
  for (let n = 3; n <= 5; n++) {
    for (const [k, c] of wantedN.get(n)!) {
      if (c < 2) continue;
      hotN.push({ ids: k.split('\u0000').map(Number), c: c * (n - 1) });
    }
  }
  hotN.sort((x, y) => y.c - x.c);

  const payload = new Set(text);
  const allowed = o.script ? CHIRON_SCRIPTS.filter(s2 => s2.name === o.script)
    : CHIRON_SCRIPTS.filter(s2 => (o.allowPolyglot ? true : s2.name !== 'polyglot'));
  const cands = allowed
    .map(s2 => ({ s: s2, pool: scriptPool(s2, enc) }))
    .map(({ s: s2, pool }) => ({ s: s2, pool, chars: pool.chars.filter(c => !payload.has(c)) }))
    .filter(x => x.chars.length >= needed)
    // more usable merge edges first; ties by alphabet size (headroom)
    .sort((x, y) => y.pool.pairs.size - x.pool.pairs.size || y.chars.length - x.chars.length)
    .slice(0, o.scriptTries ?? 2);
  if (!cands.length) return null;

  let best: BuildOut | null = null;
  for (const cand of cands) {
    if (Date.now() >= deadline) break;
    const chars = cand.chars;
    const mkMap = (arr: string[]) => { const m = new Map<number, string>(); refList.forEach((r, i) => m.set(r, arr[i])); return m; };

    // baseline assignment: pool order
    const baseArr = chars.slice(0, needed);
    const cache = new Map<string, number>();
    let bestArr = baseArr.slice();
    let bestRun = runCostPrepared(prepRuns, mkMap(bestArr), enc, cache);
    const baseRun = bestRun;

    if (!o.noAssign) {
      /* RUN-SPELLING CONSTRUCTION.
       * The pairwise greedy below asks "can this PAIR of references be made one
       * token"; this asks the stronger question "can this whole RUN be spelled
       * as one token". Cyrillic has 1896 three-character, 1329 four-character
       * and 1283 five-or-more-character single tokens, so a five-reference run
       * placed on one of them saves four tokens at a stroke, which no pair move
       * can ever see. Patterns are taken most-valuable-first and placed only
       * when every one of their references is still unassigned, which keeps the
       * construction conflict-free and O(patterns). */
      const pat = new Map<string, number[]>();
      const patC = new Map<string, number>();
      for (const run of runs) {
        const top = Math.min(6, run.length);
        for (let n = 2; n <= top; n++) {
          for (let i = 0; i + n <= run.length; i++) {
            const seg = run.slice(i, i + n);
            if (new Set(seg).size !== n) continue;
            const k = seg.join(',');
            if (!pat.has(k)) pat.set(k, seg);
            patC.set(k, (patC.get(k) ?? 0) + 1);
          }
        }
      }
      const ordered = [...pat.entries()]
        .sort((x, y) => (patC.get(y[0])! * (y[1].length - 1)) - (patC.get(x[0])! * (x[1].length - 1)))
        .slice(0, 3000);
      const asg2 = new Map<number, string>();
      const used2 = new Set<string>();
      for (const [, ids] of ordered) {
        let clash = false;
        for (const id of ids) if (asg2.has(id)) { clash = true; break; }
        if (clash) continue;
        const bank = cand.pool.ngrams.get(ids.length);
        if (!bank || !bank.length) continue;
        let scanned = 0;
        for (const tok of bank) {
          if (++scanned > 600) break;
          const cs = [...tok];
          let free = true;
          for (const c of cs) if (used2.has(c) || payload.has(c)) { free = false; break; }
          if (!free) continue;
          for (let q = 0; q < ids.length; q++) { asg2.set(ids[q], cs[q]); used2.add(cs[q]); }
          break;
        }
      }
      const spareA = chars.filter(c => !used2.has(c));
      let spA = 0;
      const spelled: string[] = [];
      let okA = true;
      for (const r of refList) { const c = asg2.get(r) ?? spareA[spA++]; if (c === undefined) { okA = false; break; } spelled.push(c); }
      if (okA && new Set(spelled).size === spelled.length) {
        const v = runCostPrepared(prepRuns, mkMap(spelled), enc, cache);
        if (v < bestRun) { bestRun = v; bestArr = spelled; }
      }
    }

    if (!o.noAssign && hotPairs.length) {
      // GUIDED GREEDY: walk the hot adjacent pairs and try to place them on real
      // merge edges of this script's pair graph. One pass, no tokenizer calls.
      const outAdj = new Map<string, string[]>();
      const inAdj = new Map<string, string[]>();
      for (const e of cand.pool.pairs) {
        const u = [...e][0], v = [...e][1];
        if (payload.has(u) || payload.has(v)) continue;
        if (!outAdj.has(u)) outAdj.set(u, []); outAdj.get(u)!.push(v);
        if (!inAdj.has(v)) inAdj.set(v, []); inAdj.get(v)!.push(u);
      }
      const assigned = new Map<number, string>();
      const used = new Set<string>();
      const take = (r: number, c: string) => { assigned.set(r, c); used.add(c); };
      for (const { u, v } of hotPairs) {
        if (assigned.has(u) && assigned.has(v)) continue;
        if (assigned.has(u)) {
          const cs = outAdj.get(assigned.get(u)!) ?? [];
          const free = cs.find(c => !used.has(c));
          if (free) take(v, free);
        } else if (assigned.has(v)) {
          const cs = inAdj.get(assigned.get(v)!) ?? [];
          const free = cs.find(c => !used.has(c));
          if (free) take(u, free);
        } else {
          let done = false;
          for (const [c1, outs] of outAdj) {
            if (used.has(c1)) continue;
            const c2 = outs.find(c => !used.has(c) && c !== c1);
            if (c2) { take(u, c1); take(v, c2); done = true; break; }
          }
          if (!done) { /* leave both for the filler pass */ }
        }
      }
      const spareChars = chars.filter(c => !used.has(c));
      let sp = 0;
      const guided = refList.map(r => assigned.get(r) ?? spareChars[sp++]);
      if (guided.every(c => c !== undefined)) {
        const v = runCostPrepared(prepRuns, mkMap(guided), enc, cache);
        if (v < bestRun) { bestRun = v; bestArr = guided as string[]; }
      }

      // cheap hill-climb on the fast score; only run-local work per probe
      let seed = 0x9e3779b9 ^ needed;
      const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0x100000000; };
      const spare2 = chars.filter(c => !new Set(bestArr).has(c)).slice(0, 128);
      const probes = Math.max(40, Math.round(Math.min(9000, 110 * needed) * (o.probeScale ?? 1)));
      let arr = bestArr.slice();
      // Precompute the edge list once; a targeted move is worth far more than a
      // random swap because the objective only pays on realised pairs.
      const edgeList = [...cand.pool.pairs].filter(e => { const a = [...e]; return !payload.has(a[0]) && !payload.has(a[1]) && a[0] !== a[1]; });
      const pos = new Map<number, number>();
      refList.forEach((r, i) => pos.set(r, i));
      void hotN;
      // DETERMINISM. This loop used to carry `&& Date.now() < deadline`, which
      // makes the emitted wire a function of machine load — caught by red-team
      // gate G10 on SIBYL (holdout/gh-api.json.txt and holdout/json-pkg.txt
      // encoded twice gave different wires). The probe count is already bounded,
      // so the clock buys nothing and costs reproducibility.
      for (let step = 0; step < probes; step++) {
        const trial = arr.slice();
        // n-gram move: force a hot run of 3..5 references onto a real n-character
        // single token. This is where the multi-character vocabulary actually pays.
        if (hotN.length && rnd() < 0.30) {
          const hn = hotN[Math.floor(rnd() * Math.min(hotN.length, 96))];
          const n = hn.ids.length;
          const bank = cand.pool.ngrams.get(n);
          if (!bank || !bank.length) continue;
          const tok = bank[Math.floor(rnd() * bank.length)];
          const cs = [...tok];
          if (cs.some(c => payload.has(c))) continue;
          if (new Set(hn.ids).size !== n) continue;
          let ok = true;
          for (let q = 0; q < n; q++) {
            const target = cs[q];
            const slot = pos.get(hn.ids[q]);
            if (slot === undefined) { ok = false; break; }
            const held = trial.indexOf(target);
            if (held >= 0) { const t0 = trial[slot]; trial[slot] = trial[held]; trial[held] = t0; }
            else trial[slot] = target;
          }
          if (!ok) continue;
          if (new Set(trial).size !== trial.length) continue;
          const v = runCostPrepared(prepRuns, mkMap(trial), enc, cache);
          if (v <= bestRun) { if (v < bestRun) { bestRun = v; bestArr = trial.slice(); } arr = trial; }
          continue;
        }
        if (edgeList.length && hotPairs.length && rnd() < 0.45) {
          // pick a hot pair and a merge edge, then swap both characters into place
          const hp = hotPairs[Math.floor(rnd() * Math.min(hotPairs.length, 64))];
          const e = edgeList[Math.floor(rnd() * edgeList.length)];
          const c1 = [...e][0], c2 = [...e][1];
          const iu = pos.get(hp.u)!, iv = pos.get(hp.v)!;
          if (iu === iv) continue;
          const j1 = trial.indexOf(c1), j2 = trial.indexOf(c2);
          if (j1 >= 0) { const t0 = trial[iu]; trial[iu] = trial[j1]; trial[j1] = t0; }
          else trial[iu] = c1;
          const j2b = trial.indexOf(c2);
          if (j2b >= 0) { const t0 = trial[iv]; trial[iv] = trial[j2b]; trial[j2b] = t0; }
          else trial[iv] = c2;
          void j2;
          if (new Set(trial).size !== trial.length) continue;
          const v = runCostPrepared(prepRuns, mkMap(trial), enc, cache);
          if (v <= bestRun) { if (v < bestRun) { bestRun = v; bestArr = trial.slice(); } arr = trial; }
          continue;
        }
        if (spare2.length && rnd() < 0.3) {
          const i = Math.floor(rnd() * trial.length);
          const c = spare2[Math.floor(rnd() * spare2.length)];
          if (trial.includes(c)) continue;
          trial[i] = c;
        } else {
          const i = Math.floor(rnd() * trial.length);
          const j = Math.floor(rnd() * trial.length);
          if (i === j) continue;
          const t2 = trial[i]; trial[i] = trial[j]; trial[j] = t2;
        }
        const v = runCostPrepared(prepRuns, mkMap(trial), enc, cache);
        if (v <= bestRun) { if (v < bestRun) { bestRun = v; bestArr = trial.slice(); } arr = trial; }
      }
    }

    const finalMap = mkMap(bestArr);
    const wire = materialise(atoms, finalMap);
    if (wire === null) continue;
    if (wire.slice(1, wire.indexOf(CHIRON_SEP, 1)).includes(CHIRON_SEP)) continue;
    const tokens = countTokens(wire, enc);
    // honest accounting of what the assignment bought: render the baseline too
    const baseWire = materialise(atoms, mkMap(baseArr));
    const baseTokens = baseWire === null ? tokens : countTokens(baseWire, enc);
    const out: BuildOut = {
      g, plan, listGlyph: new Map(), glyph: finalMap, wire, tokens,
      estimate: estAfterGrammar, scriptName: cand.s.name,
      assignmentGain: baseTokens - tokens, searchGain,
    };
    void baseRun;
    if (!best || out.tokens < best.tokens) best = out;
  }
  void estBefore;
  return best;
}


/** Cheapest `…` payload for a column of values (CHIRON's rule set, restated). */
const LIST_SEPS = [',', ' ', ';', '|', '\t', '/', ':', '\u0001', '\u0002', '\u0003'];
function listPayload(values: string[], enc: EncodingName): string | null {
  if (values.length >= 3 && values.every(v => /^-?(?:0|[1-9]\d{0,14})$/.test(v))) {
    const nums = values.map(Number);
    if (nums.every(Number.isSafeInteger)) {
      const step = nums[1] - nums[0];
      if ((step === 1 || step === -1) && nums.every((n, i) => n === nums[0] + step * i)) return `${nums[0]}..${nums[nums.length - 1]}`;
    }
  }
  let use = values;
  for (let p = 1; p <= Math.min(64, Math.floor(values.length / 2)); p++) {
    let ok = true;
    for (let i = p; i < values.length; i++) if (values[i] !== values[i % p]) { ok = false; break; }
    if (ok) { use = values.slice(0, p); break; }
  }
  for (const sep of LIST_SEPS) {
    if (use.some(v => v.includes(sep))) continue;
    const body = sep + use.join(sep);
    if (/^(-?\d{1,15})\.\.(-?\d{1,15})$/.test(body)) continue;
    void enc;
    return body;
  }
  return null;
}

/**
 * Local search over the rule set, in symbol space.
 *
 * Only affordable because a probe costs an integer re-parse rather than a
 * re-tokenization of the whole wire. Moves: drop a rule (inline it), and split
 * a rule at its best internal boundary. Both are accepted only on a strict
 * decrease of the exact symbol-space cost.
 */
function localSearch(g: Grammar, enc: EncodingName, opts: { maxSpan: number }, deadline: number) {
  const cost = () => grammarCost(g, enc);
  let cur = cost();
  for (let sweep = 0; sweep < 4 && Date.now() < deadline; sweep++) {
    let improved = false;
    // (i) drop-and-inline any macro rule whose removal helps
    for (const [sid, si] of [...g.seqOf]) {
      if (Date.now() >= deadline) break;
      if (g.seq[si].kind === 'template') continue;
      const repl = g.seq[si].body;
      if (!repl.length) continue;
      const snapMain = g.main;
      const snapBodies = g.seq.map(r => r.body);
      const sub = (seq: number[]) => { const o: number[] = []; for (const s of seq) { if (s === sid) o.push(...repl); else o.push(s); } return o; };
      g.main = sub(g.main);
      for (let i = 0; i < g.seq.length; i++) if (i !== si) g.seq[i].body = sub(g.seq[i].body);
      g.seq[si].body = [];
      g.seqOf.delete(sid);
      const c = cost();
      if (c < cur) { cur = c; improved = true; }
      else { g.main = snapMain; g.seq.forEach((r, i) => { r.body = snapBodies[i]; }); g.seqOf.set(sid, si); }
    }
    // (ii) merge two rules that always occur adjacently
    const adj = new Map<string, number>();
    const scan = (seq: number[]) => {
      for (let i = 0; i + 1 < seq.length; i++) {
        if (g.seqOf.has(seq[i]) && g.seqOf.has(seq[i + 1])) {
          const k = seq[i] + ',' + seq[i + 1];
          adj.set(k, (adj.get(k) ?? 0) + 1);
        }
      }
    };
    scan(g.main); for (const r of g.seq) scan(r.body);
    const hot = [...adj.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 24);
    for (const [k] of hot) {
      if (Date.now() >= deadline) break;
      const [a, b] = k.split(',').map(Number);
      const snapMain = g.main;
      const snapBodies = g.seq.map(r => r.body);
      const sid = g.symText.length;
      g.symText.push('');
      g.seqOf.set(sid, g.seq.length);
      g.seq.push({ id: -1, kind: 'macro', body: [a, b] });
      const fuse = (seq: number[]) => {
        const o: number[] = [];
        for (let i = 0; i < seq.length; i++) {
          if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { o.push(sid); i++; } else o.push(seq[i]);
        }
        return o;
      };
      g.main = fuse(g.main);
      for (let i = 0; i < g.seq.length - 1; i++) g.seq[i].body = fuse(g.seq[i].body);
      const c = cost();
      if (c < cur) { cur = c; improved = true; }
      else {
        g.main = snapMain;
        g.seq.pop(); g.seqOf.delete(sid); g.symText.pop();
        g.seq.forEach((r, i) => { r.body = snapBodies[i]; });
      }
    }
    if (!improved) break;
  }
  void opts;
}


/** Replace every non-overlapping occurrence of `pat` in `seq` with `sid`. */
export function replaceAll(seq: number[], pat: number[], sid: number): { out: number[]; hits: number } {
  const L = pat.length;
  const out: number[] = [];
  let hits = 0;
  for (let i = 0; i < seq.length;) {
    if (i + L <= seq.length) {
      let ok = true;
      for (let j = 0; j < L; j++) if (seq[i + j] !== pat[j]) { ok = false; break; }
      if (ok) { out.push(sid); i += L; hits++; continue; }
    }
    out.push(seq[i]); i++;
  }
  return { out, hits };
}

/**
 * GREEDY-ADD REFINEMENT — CHIRON's admission loop, in symbol space.
 *
 * The Lagrangian DP is conservative: an entry survives only if the OPTIMAL
 * parse uses it twice, which can reject a phrase that greedy replace-all would
 * have used six times. Running both and keeping whichever integer cost is lower
 * costs nothing here, because a probe is an array scan instead of a 16 KB
 * re-tokenization. Measured on bench/train/dts0.txt: closes the 39-token gap to
 * CHIRON's greedy and then passes it.
 */
function greedyAdd(g: Grammar, enc: EncodingName, maxSpan: number, topK: number, deadline: number): number {
  let cur = grammarCost(g, enc);
  const start = cur;
  for (let round = 0; round < 24 && Date.now() < deadline; round++) {
    const seqs: number[][] = [g.main];
    const owners: number[] = [-1];
    for (let i = 0; i < g.seq.length; i++) if (g.seq[i].body.length) { seqs.push(g.seq[i].body); owners.push(i); }
    const cands = mineSpans(seqs, { maxSpan, topK, priceIters: 0, fixIters: 0 });
    if (!cands.length) break;
    let applied = 0;
    for (const c of cands.slice(0, 48)) {
      if (Date.now() >= deadline) break;
      const snapMain = g.main;
      const snapBodies = g.seq.map(r => r.body);
      const sid = g.symText.length;
      g.symText.push('');
      const si = g.seq.length;
      g.seqOf.set(sid, si);
      g.seq.push({ id: -1, kind: 'macro', body: c.ids.slice() });
      let total = 0;
      const rm = replaceAll(g.main, c.ids, sid); g.main = rm.out; total += rm.hits;
      for (let i = 0; i < si; i++) {
        if (!g.seq[i].body.length) continue;
        const r = replaceAll(g.seq[i].body, c.ids, sid);
        g.seq[i].body = r.out; total += r.hits;
      }
      const cost = grammarCost(g, enc);
      if (total >= 2 && cost < cur) { cur = cost; applied++; }
      else {
        g.main = snapMain;
        g.seq.pop(); g.seqOf.delete(sid); g.symText.pop();
        g.seq.forEach((r, i) => { r.body = snapBodies[i]; });
      }
    }
    if (!applied) break;
  }
  void owners0;
  return start - cur;
}
const owners0 = 0;

/**
 * FINAL OPTIMAL RE-PARSE over the dictionary that survived.
 * Replace-all resolves overlaps by admission order; a shortest path does not
 * have to. The dictionary is already paid for, so every entry is priced at zero
 * and the parse can only shorten the sequences.
 */
function reparse(g: Grammar, enc: EncodingName, maxSpan: number, deadline: number): number {
  const before = grammarCost(g, enc);
  for (let it = 0; it < 3 && Date.now() < deadline; it++) {
    const ruleIds = [...g.seqOf.entries()].filter(([, si]) => g.seq[si].body.length >= 2);
    if (!ruleIds.length) break;
    const keep = ruleIds.map(([sid, si]) => ({ key: g.seq[si].body.join(',') + ',', ids: g.seq[si].body, sid }));
    const seqs: number[][] = [g.main];
    const owners: number[] = [-1];
    for (let i = 0; i < g.seq.length; i++) if (g.seq[i].body.length) { seqs.push(g.seq[i].body); owners.push(i); }
    // a rule may not be parsed in terms of itself
    const idx = buildIndex(seqs, keep, maxSpan);
    const price = new Float64Array(keep.length); // already paid
    const r = parseAll(seqs, idx, price, null);
    let changed = false;
    for (let s = 0; s < seqs.length; s++) {
      const selfIdx = owners[s] >= 0 ? keep.findIndex(k => g.seqOf.get(k.sid) === owners[s]) : -1;
      const out: number[] = [];
      let i = 0;
      for (const [id, L] of r.picks[s]) {
        if (id >= 0 && id !== selfIdx) { out.push(keep[id].sid); changed = changed || L > 1; }
        else for (let j = i; j < i + L; j++) out.push(seqs[s][j]);
        i += L;
      }
      if (owners[s] < 0) g.main = out; else g.seq[owners[s]].body = out;
    }
    if (!changed) break;
    // drop anything the new parse stopped using
    for (let pass = 0; pass < 6; pass++) {
      const uc = new Map<number, number>();
      const count = (seq: number[]) => { for (const x of seq) if (g.seqOf.has(x)) uc.set(x, (uc.get(x) ?? 0) + 1); };
      count(g.main); for (const rr of g.seq) count(rr.body);
      let did = false;
      for (const [sid, si] of [...g.seqOf]) {
        if (g.seq[si].kind === 'template') continue;
        const u = uc.get(sid) ?? 0;
        const L = g.seq[si].body.length;
        if (u >= 2 && u * (L - 1) - L - 1 > 0) continue;
        const repl = g.seq[si].body;
        const sub = (seq: number[]) => { const o: number[] = []; for (const x of seq) { if (x === sid) o.push(...repl); else o.push(x); } return o; };
        g.main = sub(g.main);
        for (let i2 = 0; i2 < g.seq.length; i2++) if (i2 !== si) g.seq[i2].body = sub(g.seq[i2].body);
        g.seq[si].body = [];
        g.seqOf.delete(sid);
        did = true;
      }
      if (!did) break;
    }
  }
  return before - grammarCost(g, enc);
}

export function ariadneEncode(text: string, enc: EncodingName = 'o200k_base', options: AriadneOptions = {}): AriadneResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const raw = rawResult(text, enc, started);
  if (text.length < 16) return raw;

  const budgetMs = options.budgetMs ?? Math.min(9000, 600 + text.length * 0.7);
  const full: Required<Omit<AriadneOptions, 'script' | 'sep'>> & { script?: string } = {
    budgetMs,
    maxSpan: options.maxSpan ?? 24,
    topK: options.topK ?? 8000,
    levels: options.levels ?? 6,
    noAssign: options.noAssign ?? false,
    allowPolyglot: options.allowPolyglot ?? false,
    noSearch: options.noSearch ?? false,
    noBlocks: options.noBlocks ?? false,
    script: options.script,
  };
  const overall = started + Math.min(26_000, Math.round(budgetMs * 2.6));
  const seps = options.sep !== undefined ? [options.sep] : chironSeparators(text);

  /**
   * CONTRACT-AWARE OPERATOR ADMISSION.
   * The objective is the MESSAGE, not the wire. A block pass can shorten the
   * wire and still lose, because `×btn` and `…` cost ~50 tokens of clause that
   * a macro-only wire never pays. Measured: holdout/code-dts is 97 wire + 81
   * contract = 178 with blocks (worse than its 162-token identity) and 70 + 38
   * = 108 without; three-regime is 143 + 88 = 231 with and 173 + 39 = 212
   * without. So every variant is scored on M, and the block pass is re-run
   * disabled whenever it actually fired.
   */
  const scored: Array<{ out: BuildOut; M: number; tag: string }> = [];
  const consider = (out: BuildOut | null, tag: string) => {
    if (!out) return null;
    if (chironDecode(out.wire) !== text) return null;
    const M = countTokens(chironDecoderPrompt(out.wire), enc);
    scored.push({ out, M, tag });
    return out;
  };
  // The macro grammar does not depend on the unit separator, only the block
  // pass does — so choose the separator with a cheap block-finder pre-pass
  // instead of re-running the whole pipeline per separator.
  let sep = seps[0];
  if (seps.length > 1 && !options.noBlocks) {
    const BL = ['@', '·', '¤', '†', '‡', '»', '«', '¦', '¬', '±', '°', 'µ', '★', '◆', '\u0001', '\u0002'];
    const blank = BL.find(c => countTokens(c, enc) === 1 && !text.includes(c));
    if (blank) {
      let bestGain = -1;
      for (const cand of seps) {
        let gain = 0;
        try { for (const b of chironFindBlocks(text, blank, cand, enc, Date.now() + 1200)) gain += b.gain; } catch { gain = -1; }
        if (gain > bestGain) { bestGain = gain; sep = cand; }
      }
    }
  }
  // Try the ranked separator first, but NEVER give up because one separator
  // happened to produce a chunk the tokenizer does not reconstruct: fall through
  // to the others. (Measured: holdout/readme.txt silently fell back to identity,
  // 843 instead of 684, whenever the block pre-pass ranked '\n' first.)
  const order = [sep, ...seps.filter(x => x !== sep)];
  for (const trySep of order) {
    if (Date.now() > overall - 200) break;
    let o1: BuildOut | null = null;
    try { o1 = buildOn(text, enc, trySep, full, Math.min(overall, Date.now() + budgetMs)); } catch { o1 = null; }
    const got = consider(o1, `full/${JSON.stringify(trySep)}`);
    if (o1 && o1.g.blocks.length && !options.noBlocks && Date.now() < overall - 200) {
      let o2: BuildOut | null = null;
      try { o2 = buildOn(text, enc, trySep, { ...full, noBlocks: true }, Math.min(overall, Date.now() + budgetMs)); } catch { o2 = null; }
      consider(o2, 'macros-only');
    }
    if (got) break;
  }
  if (!scored.length) return raw;
  scored.sort((a, b) => a.M - b.M || a.out.tokens - b.out.tokens);
  const best = scored[0].out;
  const chosenTag = scored[0].tag;

  const prompt = chironDecoderPrompt(best.wire);
  const messageTokens = countTokens(prompt, enc);
  if (messageTokens >= inTokens) {
    return { ...raw, notes: `${raw.notes}; message gate: framed ${messageTokens} >= raw ${inTokens} (wire ${best.tokens})` };
  }
  const u = chironOpsUsed(best.wire);
  const ops: string[] = [];
  if (u.rules) ops.push('rules');
  if (u.rep) ops.push('repeat');
  if (u.fill) ops.push('fill');
  if (u.range) ops.push('range');
  if (u.split) ops.push('list');
  return {
    codec: 'ariadne',
    wire: best.wire,
    decoded: chironDecode(best.wire),
    exact: true,
    inTokens,
    outTokens: best.tokens,
    messageTokens,
    contractTokens: messageTokens - best.tokens,
    decoderPrompt: prompt,
    savingsPct: inTokens ? Math.round((1 - messageTokens / inTokens) * 1000) / 10 : 0,
    rules: best.plan.order.length - best.g.blocks.length,
    blocks: best.g.blocks.length,
    lists: best.g.lists.length,
    script: best.scriptName,
    ops,
    ms: Date.now() - started,
    mode: 'ariadne',
    notes: `${chosenTag}; symbol-space DP; ${best.plan.order.length - best.g.blocks.length} macros, ${best.g.blocks.length} blocks, ${best.g.lists.length} lists; script=${best.scriptName}; est=${best.estimate} exact=${best.tokens}; assignment -${best.assignmentGain}, local search -${best.searchGain}; contract=${messageTokens - best.tokens} for [${ops.join(',')}]`,
    estimate: best.estimate,
    assignmentGain: best.assignmentGain,
    searchGain: best.searchGain,
  };
}

/** Decoding is CHIRON's, verbatim: ARIADNE emits the same wire language. */
export const ariadneDecode = chironDecode;
export const ariadneDecoderPrompt = chironDecoderPrompt;
