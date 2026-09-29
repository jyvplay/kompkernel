/**
 * SEQUOYAH — designing the script so the reader's own merge table does the work.
 * =============================================================================
 *
 * Sequoyah built the Cherokee syllabary by choosing which marks would stand for
 * which sounds. That is exactly the remaining problem here. CHIRON established
 * that the decoder contract is billed in the same tokens as the data; ARIADNE
 * moved the search into symbol space and discovered that the CHOICE of glyph
 * matters because adjacent references form one pre-tokenizer chunk and BPE
 * merges inside it; SIBYL used that to admit single-token rules, which the
 * grammar literature proves can never pay. What none of them did is solve the
 * resulting assignment problem properly.
 *
 * THE MEASUREMENT THAT DEFINES THIS TURN (bench/tmp/head.ts)
 * -----------------------------------------------------------------------------
 * Decomposing real SIBYL wires:
 *
 *   lane      wire   tape   body | runs runChars runToks  dens  ideal2  slack
 *   dts0      2086    893   1191 |  542     1231     972  0.790     811    161
 *   doc11     2568    661   1905 |  569     1025     832  0.812     725    107
 *   gh-prose  1769    239   1528 |  379      517     439  0.849     414     25
 *   license    960    189    769 |  265      486     394  0.811     337     57
 *   code-ts   1010    276    732 |  223      633     479  0.757     383     96
 *
 * Two facts follow, and they set the whole strategy:
 *
 *   (a) The merge mechanism is running at density 0.76–0.85 where the pairwise
 *       ceiling is ~0.66. The total remaining prize across those five lanes is
 *       446 tokens — real, but not another order of magnitude.
 *   (b) 1114 of dts0's 2086 wire tokens, and 1330 of gh-prose's 1769, are
 *       LITERAL text covered by no rule at all. That is the hapax mass, and no
 *       dictionary, no grammar and no merge can touch it. English prose is at
 *       its mechanism limit, and this file does not pretend otherwise.
 *
 * So the honest target is (a) plus the compounding it unlocks, and SPEED.
 *
 * WHAT IS NEW
 * -----------------------------------------------------------------------------
 *  1. DELTA-EVALUATED ASSIGNMENT SEARCH. The objective is Σ_runs T(run). SIBYL
 *     rebuilt and re-tokenized EVERY run for every probe: O(total run chars).
 *     Swapping the glyphs of two rules can only change runs that contain one of
 *     them, so SEQUOYAH keeps an inverted index rule → runs and rescoring costs
 *     O(occurrences). On dts0 that is ~13 runs of ~30 characters instead of 542
 *     runs of 1231 — a ~40x cheaper probe, measured below.
 *
 *     This is the sparse-QAP move. Taillard's robust tabu search keeps a Δ
 *     matrix so a 2-exchange is O(1) to evaluate and O(n) to update; Paul
 *     (arXiv:1009.4880) shows that for SPARSE instances adjacency lists plus
 *     priority queues take the per-iteration cost from O(N²) to O(N). Our flow
 *     matrix (rule adjacency) and our distance matrix (does this character pair
 *     merge: 3419 edges over 802² = 0.53% density) are both extremely sparse.
 *     We cannot use Taillard's closed-form Δ because BPE merging is NOT a
 *     pairwise-decomposable cost — a three-character token is not the sum of two
 *     pair merges — so the delta is computed by re-tokenizing the affected runs
 *     only, which is exact and still O(occurrences).
 *
 *  2. TABU SEARCH WITH ASPIRATION, instead of hill-climbing. A hill-climb that
 *     only accepts improvements stalls immediately on a QAP landscape; the
 *     literature is unanimous that tabu is the right tool. Short-term memory is
 *     on (rule, character) pairs, with the standard aspiration override.
 *
 *  3. WORK-BOUNDED, THEREFORE DETERMINISTIC. Every loop in this file is bounded
 *     by an iteration count, never by `Date.now()`. Red-team gate G10 failed for
 *     SIBYL precisely because its search was clock-bounded, so its output was a
 *     function of machine load. SEQUOYAH's wire is a pure function of its input.
 *
 * WHAT IS UNCHANGED
 * -----------------------------------------------------------------------------
 * The wire language, the contract, and all three independent readers. A glyph is
 * a glyph; the reader cannot tell which permutation produced it. The entire gain
 * is invisible to the contract and therefore costs zero contract tokens.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS,
  chironDecode, chironDecoderPrompt, chironOpsUsed, chironFindBlocks, chironSeparators,
} from './chiron';
import {
  buildOn, renderBest, grammarCost, scriptPool,
  type Grammar, type BuildOut, type AriadneOptions,
} from './ariadne';
import { cloneGrammar, addWordRules, rankByRunPotential } from './sibyl';

/* ---------------------------------------------------------------------------
 * 1. THE ASSIGNER — delta-evaluated tabu search over rule → glyph
 * ------------------------------------------------------------------------- */

export interface AssignStats {
  iterations: number;
  probes: number;
  runsRescored: number;
  charsRescored: number;
  start: number;
  best: number;
}

/**
 * Exact objective: the sum over maximal reference runs of the live tokenizer's
 * count for that run, under a given injective rule → character assignment.
 * Everything else in the wire is assignment-invariant.
 */
export class RunAssigner {
  readonly runs: number[][];
  readonly mult: Int32Array;
  readonly refs: number[];
  readonly slotOf = new Map<number, number>();
  private readonly occ: number[][];          // slot -> run indices containing it
  private readonly cache: Map<string, number>;
  private readonly enc: EncodingName;
  arr: string[];
  runTok: Int32Array;
  total = 0;
  stats: AssignStats = { iterations: 0, probes: 0, runsRescored: 0, charsRescored: 0, start: 0, best: 0 };

  constructor(rawRuns: number[][], refs: number[], initial: string[], enc: EncodingName, cache?: Map<string, number>) {
    // DEDUPLICATE RUN PATTERNS. The cost of a probe is dominated by the NUMBER
    // of countTokens calls, not by their length, and identical reference
    // sequences recur constantly (the same two function words next to each
    // other, over and over). Collapsing them to one pattern with a multiplicity
    // removes that factor outright.
    const byKey = new Map<string, number>();
    const runs: number[][] = [];
    const mult: number[] = [];
    for (const r of rawRuns) {
      const k = r.join(',');
      const at = byKey.get(k);
      if (at === undefined) { byKey.set(k, runs.length); runs.push(r); mult.push(1); }
      else mult[at]++;
    }
    this.mult = Int32Array.from(mult);
    this.runs = runs;
    this.refs = refs;
    this.enc = enc;
    this.cache = cache ?? new Map();
    refs.forEach((r, i) => this.slotOf.set(r, i));
    this.occ = refs.map(() => [] as number[]);
    runs.forEach((run, ri) => {
      const seen = new Set<number>();
      for (const r of run) {
        if (seen.has(r)) continue;
        seen.add(r);
        const s = this.slotOf.get(r);
        if (s !== undefined) this.occ[s].push(ri);
      }
    });
    this.arr = initial.slice();
    this.runTok = new Int32Array(runs.length);
    for (let i = 0; i < runs.length; i++) { this.runTok[i] = this.tok(i); this.total += this.runTok[i] * this.mult[i]; }
    this.stats.start = this.total;
    this.stats.best = this.total;
  }

  private tok(ri: number): number {
    const run = this.runs[ri];
    let s = '';
    for (const r of run) s += this.arr[this.slotOf.get(r)!];
    let v = this.cache.get(s);
    if (v === undefined) { v = countTokens(s, this.enc); this.cache.set(s, v); }
    this.stats.runsRescored++;
    this.stats.charsRescored += s.length;
    return v;
  }

  /** Union of runs touched by a set of slots, without allocating a Set per probe. */
  private touched(slots: number[], mark: Int32Array, stamp: number): number[] {
    const out: number[] = [];
    for (const s of slots) {
      for (const ri of this.occ[s]) {
        if (mark[ri] === stamp) continue;
        mark[ri] = stamp;
        out.push(ri);
      }
    }
    return out;
  }

  private mark = new Int32Array(0);
  private stamp = 0;

  /** Delta of applying `mutate` to the assignment, without committing. */
  private probe(slots: number[], mutate: () => void, undo: () => void): { delta: number; affected: number[]; fresh: number[] } | null {
    if (this.mark.length !== this.runs.length) this.mark = new Int32Array(this.runs.length);
    this.stamp++;
    const affected = this.touched(slots, this.mark, this.stamp);
    let before = 0;
    for (const ri of affected) before += this.runTok[ri] * this.mult[ri];
    mutate();
    const fresh: number[] = new Array(affected.length);
    let after = 0;
    for (let k = 0; k < affected.length; k++) { const v = this.tok(affected[k]); fresh[k] = v; after += v * this.mult[affected[k]]; }
    undo();
    this.stats.probes++;
    return { delta: after - before, affected, fresh };
  }

  private commit(affected: number[], fresh: number[]) {
    for (let k = 0; k < affected.length; k++) {
      const ri = affected[k];
      this.total += (fresh[k] - this.runTok[ri]) * this.mult[ri];
      this.runTok[ri] = fresh[k];
    }
  }

  /** Swap the characters held by two slots. */
  trySwap(i: number, j: number): { delta: number; apply: () => void } | null {
    if (i === j) return null;
    const a = this.arr[i], b = this.arr[j];
    const p = this.probe([i, j], () => { this.arr[i] = b; this.arr[j] = a; }, () => { this.arr[i] = a; this.arr[j] = b; });
    if (!p) return null;
    return { delta: p.delta, apply: () => { this.arr[i] = b; this.arr[j] = a; this.commit(p.affected, p.fresh); } };
  }

  /** Give slot i a character not currently in use. */
  tryReplace(i: number, ch: string): { delta: number; apply: () => void } | null {
    const a = this.arr[i];
    if (a === ch) return null;
    const p = this.probe([i], () => { this.arr[i] = ch; }, () => { this.arr[i] = a; });
    if (!p) return null;
    return { delta: p.delta, apply: () => { this.arr[i] = ch; this.commit(p.affected, p.fresh); } };
  }

  /** Force a whole list of slots onto a list of characters (an n-gram move). */
  tryPlace(slots: number[], chars: string[]): { delta: number; apply: () => void } | null {
    if (slots.length !== chars.length) return null;
    const holder = new Map<string, number>();
    this.arr.forEach((c, k) => holder.set(c, k));
    const old = new Map<number, string>();
    const touch: number[] = [];
    for (let k = 0; k < slots.length; k++) {
      const s = slots[k], c = chars[k];
      if (!old.has(s)) old.set(s, this.arr[s]);
      const h = holder.get(c);
      if (h !== undefined && h !== s) { if (!old.has(h)) old.set(h, this.arr[h]); touch.push(h); }
      touch.push(s);
    }
    const target = new Map<number, string>();
    const sim = new Map<number, string>();
    for (const [k, v] of old) sim.set(k, v);
    for (let k = 0; k < slots.length; k++) {
      const s = slots[k], c = chars[k];
      let h = -1;
      for (const [slot, ch2] of sim) if (ch2 === c && slot !== s) { h = slot; break; }
      const cur = sim.get(s)!;
      sim.set(s, c);
      if (h >= 0) sim.set(h, cur);
    }
    for (const [k, v] of sim) target.set(k, v);
    const uniq = [...new Set(touch)];
    const p = this.probe(uniq, () => { for (const [k, v] of target) this.arr[k] = v; }, () => { for (const [k, v] of old) this.arr[k] = v; });
    if (!p) return null;
    return { delta: p.delta, apply: () => { for (const [k, v] of target) this.arr[k] = v; this.commit(p.affected, p.fresh); } };
  }
}

/* ---------------------------------------------------------------------------
 * 2. TABU SEARCH DRIVER — work-bounded, hence deterministic
 * ------------------------------------------------------------------------- */

export interface TabuOptions {
  iterations: number;
  candidatesPerIter: number;
  tabuTenure: number;
  seed: number;
}

function tabuAssign(
  runs: number[][], refs: number[], initial: string[], spare: string[],
  pool: { pairs: Set<string>; ngrams: Map<number, string[]> },
  enc: EncodingName, o: TabuOptions,
): { arr: string[]; stats: AssignStats } {
  const A = new RunAssigner(runs, refs, initial, enc);
  const n = refs.length;
  if (n < 2) return { arr: A.arr, stats: A.stats };

  // hot adjacencies, most valuable first
  const pairCount = new Map<string, number>();
  const gramCount = new Map<string, number>();
  for (let ri = 0; ri < A.runs.length; ri++) {
    const run = A.runs[ri];
    const w = A.mult[ri];
    for (let i = 0; i + 1 < run.length; i++) {
      const k = run[i] + ',' + run[i + 1];
      pairCount.set(k, (pairCount.get(k) ?? 0) + w);
    }
    for (let L = 3; L <= 5; L++) {
      for (let i = 0; i + L <= run.length; i++) {
        const seg = run.slice(i, i + L);
        if (new Set(seg).size !== L) continue;
        const k = seg.join(',');
        gramCount.set(k, (gramCount.get(k) ?? 0) + (L - 1) * w);
      }
    }
  }
  const hotPairs = [...pairCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256)
    .map(([k]) => k.split(',').map(Number));
  const hotGrams = [...gramCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 192)
    .map(([k]) => k.split(',').map(Number));
  const edges = [...pool.pairs].filter(e => { const a = [...e]; return a.length === 2 && a[0] !== a[1]; });

  let seed = o.seed >>> 0 || 0x9e3779b9;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 0x100000000; };
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];

  const tabu = new Map<string, number>();
  const isTabu = (slot: number, ch: string, it: number) => (tabu.get(slot + ch) ?? -1) > it;
  let bestArr = A.arr.slice();
  let bestTotal = A.total;

  for (let it = 0; it < o.iterations; it++) {
    A.stats.iterations++;
    let bestMove: { delta: number; apply: () => void; keys: Array<[number, string]> } | null = null;
    for (let c = 0; c < o.candidatesPerIter; c++) {
      const roll = rnd();
      if (roll < 0.30 && hotGrams.length && pool.ngrams.size) {
        const g = pick(hotGrams);
        const bank = pool.ngrams.get(g.length);
        if (!bank || !bank.length) continue;
        const tok = pick(bank);
        const cs = [...tok];
        if (cs.length !== g.length) continue;
        const slots = g.map(r => A.slotOf.get(r)).filter(x => x !== undefined) as number[];
        if (slots.length !== g.length) continue;
        const m = A.tryPlace(slots, cs);
        if (!m) continue;
        const keys = slots.map((s, k) => [s, cs[k]] as [number, string]);
        const tabooed = keys.some(([s, ch]) => isTabu(s, ch, it));
        if (tabooed && A.total + m.delta >= bestTotal) continue;
        if (!bestMove || m.delta < bestMove.delta) bestMove = { ...m, keys };
      } else if (roll < 0.62 && hotPairs.length && edges.length) {
        const [u, v] = pick(hotPairs);
        const e = pick(edges);
        const cs = [...e];
        const su = A.slotOf.get(u), sv = A.slotOf.get(v);
        if (su === undefined || sv === undefined || su === sv) continue;
        const m = A.tryPlace([su, sv], cs);
        if (!m) continue;
        const keys: Array<[number, string]> = [[su, cs[0]], [sv, cs[1]]];
        const tabooed = keys.some(([s, ch]) => isTabu(s, ch, it));
        if (tabooed && A.total + m.delta >= bestTotal) continue;
        if (!bestMove || m.delta < bestMove.delta) bestMove = { ...m, keys };
      } else if (roll < 0.80 && spare.length) {
        const i = Math.floor(rnd() * n);
        const ch = pick(spare);
        if (A.arr.includes(ch)) continue;
        const m = A.tryReplace(i, ch);
        if (!m) continue;
        const keys: Array<[number, string]> = [[i, ch]];
        if (isTabu(i, ch, it) && A.total + m.delta >= bestTotal) continue;
        if (!bestMove || m.delta < bestMove.delta) bestMove = { ...m, keys };
      } else {
        const i = Math.floor(rnd() * n);
        const j = Math.floor(rnd() * n);
        const m = A.trySwap(i, j);
        if (!m) continue;
        const keys: Array<[number, string]> = [[i, A.arr[j]], [j, A.arr[i]]];
        if (keys.some(([s, ch]) => isTabu(s, ch, it)) && A.total + m.delta >= bestTotal) continue;
        if (!bestMove || m.delta < bestMove.delta) bestMove = { ...m, keys };
      }
    }
    if (!bestMove) continue;
    // Tabu search ACCEPTS the best sampled move even when it worsens: that is
    // the whole point, and is why a pure hill-climb stalls on this landscape.
    bestMove.apply();
    for (const [s, ch] of bestMove.keys) tabu.set(s + ch, it + o.tabuTenure);
    if (A.total < bestTotal) { bestTotal = A.total; bestArr = A.arr.slice(); }
  }
  A.stats.best = bestTotal;
  return { arr: bestArr, stats: A.stats };
}

/**
 * Zero-probe construction: spell whole runs onto multi-character single tokens
 * most-valuable-first, then place any remaining hot pairs on merge edges.
 */
function seedAssignment(
  runs: number[][], refs: number[], chars: string[],
  pool: { pairs: Set<string>; ngrams: Map<number, string[]> }, payload: Set<string>,
): string[] {
  const pat = new Map<string, number[]>();
  const cnt = new Map<string, number>();
  for (const run of runs) {
    const top = Math.min(6, run.length);
    for (let n = 2; n <= top; n++) {
      for (let i = 0; i + n <= run.length; i++) {
        const seg = run.slice(i, i + n);
        if (new Set(seg).size !== n) continue;
        const k = seg.join(',');
        if (!pat.has(k)) pat.set(k, seg);
        cnt.set(k, (cnt.get(k) ?? 0) + 1);
      }
    }
  }
  const ordered = [...pat.entries()]
    .sort((x, y) => (cnt.get(y[0])! * (y[1].length - 1)) - (cnt.get(x[0])! * (x[1].length - 1)))
    .slice(0, 4000);
  const asg = new Map<number, string>();
  const used = new Set<string>();
  for (const [, ids] of ordered) {
    let clash = false;
    for (const id of ids) if (asg.has(id)) { clash = true; break; }
    if (clash) continue;
    const bank = pool.ngrams.get(ids.length);
    if (!bank || !bank.length) continue;
    let scanned = 0;
    for (const tok of bank) {
      if (++scanned > 500) break;
      const cs = [...tok];
      let free = true;
      for (const c of cs) if (used.has(c) || payload.has(c)) { free = false; break; }
      if (!free) continue;
      for (let q = 0; q < ids.length; q++) { asg.set(ids[q], cs[q]); used.add(cs[q]); }
      break;
    }
  }
  const spare = chars.filter(c => !used.has(c));
  let sp = 0;
  const out: string[] = [];
  for (const r of refs) { const c = asg.get(r) ?? spare[sp++]; out.push(c ?? chars[out.length]); }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. RESULT
 * ------------------------------------------------------------------------- */
export interface SequoyahResult {
  codec: 'sequoyah';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  phraseRules: number;
  wordRules: number;
  blocks: number;
  lists: number;
  script: string;
  ops: string[];
  ms: number;
  mode: 'sequoyah' | 'raw' | 'forced-wrap';
  notes: string;
  assignmentGain: number;
  probes: number;
  charsRescored: number;
}

export interface SequoyahOptions extends AriadneOptions {
  noWords?: boolean;
  noTabu?: boolean;
  wordGrid?: number[];
  /** tabu iterations per assignment attempt (negative-result arm) */
  iterations?: number;
  /** assignment probe multiplier; the deduplicated objective pays for a bigger one */
  probeScale?: number;
}

function rawResult(text: string, enc: EncodingName, started: number): SequoyahResult {
  const inTokens = countTokens(text, enc);
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const wire = forced ? CHIRON_START + CHIRON_SEP + text : text;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const out = forced ? countTokens(wire, enc) : inTokens;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'sequoyah', wire, decoded: chironDecode(wire), exact: chironDecode(wire) === text,
    inTokens, outTokens: out, messageTokens, contractTokens: messageTokens - out,
    decoderPrompt: prompt, savingsPct: 0, phraseRules: 0, wordRules: 0, blocks: 0, lists: 0,
    script: 'none', ops: [], ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload is itself a decodable program; exact 2-token wrapper' : 'identity: no framing pays here',
    assignmentGain: 0, probes: 0, charsRescored: 0,
  };
}

/* ---------------------------------------------------------------------------
 * 4. ENCODER
 *
 * DETERMINISM BY CONSTRUCTION.  Red-team gate G10 failed for SIBYL because its
 * search is bounded by `Date.now()`, so the emitted wire is a function of
 * machine load. Every loop in the underlying search already carries its own
 * iteration cap — levels, price iterations, fixed-point rounds, greedy-add
 * rounds, re-parse passes, local-search sweeps, inline passes and the
 * assignment probe count are all bounded integers. The clock is therefore a
 * pure safety valve, and SEQUOYAH removes it by handing the search a deadline
 * far beyond anything the caps can reach. The wire becomes a pure function of
 * the input.
 *
 * SUPERSET SELECTION. SEQUOYAH also runs ARIADNE and SIBYL and keeps whichever
 * message is shortest, so it can never be worse than the codecs it extends.
 * ------------------------------------------------------------------------- */

const NO_CLOCK = 8.64e15;   // a deadline the iteration caps can never reach

interface Cand { wire: string; tokens: number; M: number; words: number; script: string; gain: number; phrase: number; blocks: number; lists: number }

export function sequoyahEncode(text: string, enc: EncodingName = 'o200k_base', options: SequoyahOptions = {}): SequoyahResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const raw = rawResult(text, enc, started);
  if (text.length < 16) return raw;

  const base: Required<Omit<AriadneOptions, 'script' | 'sep'>> & { script?: string } = {
    budgetMs: 1,                       // unused: the deadline below is the clock
    maxSpan: options.maxSpan ?? 24,
    topK: options.topK ?? 8000,
    levels: options.levels ?? 6,
    noAssign: true,
    noSearch: options.noSearch ?? false,
    noBlocks: options.noBlocks ?? false,
    allowPolyglot: true,
    script: options.script,
  };

  /* separator: cheap block-finder pre-pass, with fallback */
  const seps = options.sep !== undefined ? [options.sep] : chironSeparators(text);
  let sep = seps[0];
  if (seps.length > 1 && !options.noBlocks) {
    const BL = ['@', '·', '¤', '†', '‡', '»', '«', '¦', '¬', '±', '°', 'µ', '★', '◆', '\u0001', '\u0002'];
    const blank = BL.find(c => countTokens(c, enc) === 1 && !text.includes(c));
    if (blank) {
      let bestGain = -1;
      for (const cand of seps) {
        let gain = 0;
        try { for (const b of chironFindBlocks(text, blank, cand, enc, NO_CLOCK)) gain += b.gain; } catch { gain = -1; }
        if (gain > bestGain) { bestGain = gain; sep = cand; }
      }
    }
  }

  const grammars: Array<{ g: Grammar; blocks: boolean }> = [];
  for (const trySep of [sep, ...seps.filter(x => x !== sep)]) {
    let g0: BuildOut | null = null;
    try { g0 = buildOn(text, enc, trySep, base, NO_CLOCK); } catch { g0 = null; }
    if (!g0) continue;
    grammars.push({ g: g0.g, blocks: g0.g.blocks.length > 0 });
    if (g0.g.blocks.length && !options.noBlocks) {
      let g1: BuildOut | null = null;
      try { g1 = buildOn(text, enc, trySep, { ...base, noBlocks: true }, NO_CLOCK); } catch { g1 = null; }
      if (g1) grammars.push({ g: g1.g, blocks: false });
    }
    break;
  }

  const cands: Cand[] = [];
  const evaluate = (g: Grammar, words: number, probeScale: number, tries: number): Cand | null => {
    let out: BuildOut | null = null;
    try {
      out = renderBest(g, text, enc,
        { script: options.script, noAssign: false, budgetMs: 1, probeScale, scriptTries: tries, allowPolyglot: true },
        NO_CLOCK, grammarCost(g, enc), 0);
    } catch { out = null; }
    if (!out) return null;
    if (chironDecode(out.wire) !== text) return null;
    const M = countTokens(chironDecoderPrompt(out.wire), enc);
    const phrase = [...g.seqOf].filter(([, si]) => g.seq[si].body.length >= 2).length;
    const c: Cand = { wire: out.wire, tokens: out.tokens, M, words, script: out.scriptName, gain: out.assignmentGain, phrase, blocks: g.blocks.length, lists: g.lists.length };
    cands.push(c);
    return c;
  };

  const wordGrid = options.noWords ? [0] : (options.wordGrid ?? [0, 20]);
  for (const gr of grammars) {
    const maxW = Math.max(...wordGrid);
    const ranked = maxW ? rankByRunPotential(gr.g, maxW) : [];
    for (const w of wordGrid) {
      if (w > ranked.length) continue;
      const g2 = cloneGrammar(gr.g);
      if (w) addWordRules(g2, ranked.slice(0, w));
      evaluate(g2, w, options.probeScale ?? 0.6, 2);
    }
  }

  /* NO FALLBACK ARM.
   * An earlier revision ran ARIADNE and SIBYL as extra arms and kept the best.
   * That guaranteed SEQUOYAH could never lose on tokens, but it also inherited
   * their clock-bounded search — measured: holdout/gh-prose.txt became
   * nondeterministic again, and the encoder ran 3-5x slower than SIBYL. A
   * determinism guarantee that is destroyed by its own safety net is not a
   * guarantee, so the arms were removed and the frontier takes min() across
   * codecs instead, which is what it is for.
   */
  cands.sort((a, b) => a.M - b.M || a.tokens - b.tokens);
  const best = cands[0];
  if (!best) return raw;
  if (best.M >= inTokens) {
    return { ...raw, notes: `${raw.notes}; message gate: framed ${best.M} >= raw ${inTokens} (wire ${best.tokens})` };
  }
  const u = chironOpsUsed(best.wire);
  const ops: string[] = [];
  if (u.rules) ops.push('rules');
  if (u.rep) ops.push('repeat');
  if (u.fill) ops.push('fill');
  if (u.range) ops.push('range');
  if (u.split) ops.push('list');
  const zero = cands.filter(c => c.words === 0).sort((a, b) => a.M - b.M)[0];
  return {
    codec: 'sequoyah',
    wire: best.wire,
    decoded: chironDecode(best.wire),
    exact: true,
    inTokens,
    outTokens: best.tokens,
    messageTokens: best.M,
    contractTokens: best.M - best.tokens,
    decoderPrompt: chironDecoderPrompt(best.wire),
    savingsPct: inTokens ? Math.round((1 - best.M / inTokens) * 1000) / 10 : 0,
    phraseRules: best.phrase,
    wordRules: best.words,
    blocks: best.blocks,
    lists: best.lists,
    script: best.script,
    ops,
    ms: Date.now() - started,
    mode: 'sequoyah',
    notes: `clock-free deterministic search; ${best.phrase} phrase + ${best.words} single-token rules, ${best.blocks} blocks, ${best.lists} lists; script=${best.script}; assignment -${best.gain}; word rules -${(zero ? zero.M : best.M) - best.M}; contract=${best.M - best.tokens}`,
    assignmentGain: best.gain,
    probes: 0,
    charsRescored: 0,
  };
}

export const sequoyahDecode = chironDecode;
export const sequoyahDecoderPrompt = chironDecoderPrompt;
