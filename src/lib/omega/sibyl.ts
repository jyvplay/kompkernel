/**
 * SIBYL — the leaves of the Cumaean Sibyl: the message is written in a script
 * the tokenizer itself reads more cheaply than the language it encodes.
 * =============================================================================
 *
 * THE ONE IDEA
 * -----------------------------------------------------------------------------
 * Every grammar compressor in this repository — HERMES, CHIRON, ARIADNE, and
 * Re-Pair, Sequitur, LZ78 and the rest of the literature they descend from —
 * filters candidate rules to spans of at least TWO symbols. The filter is not a
 * heuristic, it is a proof:
 *
 *      a rule whose expansion is ONE token costs 1 (its name in the tape)
 *      + 1 (its text in the tape) and saves 0 per use, because the reference
 *      and the token it replaces both cost exactly one token.
 *
 * That proof has a hypothesis, and last turn measured the hypothesis to be
 * FALSE. A maximal run of adjacent references is a single pre-tokenizer chunk,
 * so BPE merges inside it, and o200k contains thousands of multi-character
 * single tokens per script (cyrillic: 122 one-character, 823 two-character,
 * 1896 three-character). A reference in a run therefore costs LESS than one
 * token — and the moment it does, single-token rules start to pay.
 *
 * Which single tokens? The frequent ones. In English that is exactly the
 * function-word class, and function words CLUSTER — " of the ", " to be ",
 * " in a ", " is not " — so the adjacency that merging needs is precisely where
 * English prose keeps its mass. The mechanism that unlocks prose is the one the
 * field proved could never help.
 *
 * MEASURED, BEFORE ANY GRAMMAR IS INVOLVED (bench/tmp/word.ts)
 * -----------------------------------------------------------------------------
 * Dictionary-ising only the top-K most frequent SINGLE tokens, with the
 * character assignment optimised for merging, and nothing else:
 *
 *      lane       identity    K   script      body     total    vs identity
 *      dts0           3991  110   cyrillic    2882      3103      -888
 *      doc11          3677   64   cyrillic    3122      3250      -427
 *      license        1166   32   cyrillic     952      1017      -149
 *      gh-prose       1934   64   cyrillic    1741      1870       -64
 *
 * A 32-entry dictionary of single English words takes `license` down 149 tokens
 * on its own. No phrase is longer than one token. No grammar exists.
 *
 * WHAT SIBYL ADDS TO ARIADNE
 * -----------------------------------------------------------------------------
 *  1. Single-token rule admission, selected by the EXACT rendered token count
 *     after assignment — the only score that can see a tokenizer effect. The
 *     symbol-space objective ARIADNE searches with says every one of these rules
 *     costs +2 and saves 0, so they can only ever be admitted by measurement.
 *  2. A joint search over (phrase-rule budget, word-rule count, script). The
 *     dense-graph alphabets are small — cyrillic has 122 usable characters
 *     against cjk's 2517 — so admitting word rules can force a move to a
 *     sparser alphabet, and the two effects have to be traded against each
 *     other per input rather than assumed.
 *  3. A rule-inlining cap, so the search can spend its alphabet on words instead
 *     of phrases when that is the better buy.
 *
 * WHAT IT DOES NOT CHANGE
 * -----------------------------------------------------------------------------
 * Nothing about the wire. A rule whose text is one token is already legal
 * CHIRON/ARIADNE syntax — `гthe` is a rule like any other. So the emitted
 * program is read by the same contract and validated, unchanged, by all three
 * independent readers: the library decoder, the reader written from the prose
 * alone, and the CPython reader in a separate process. The entire contribution
 * is in the ADMISSION RULE, and it costs zero contract tokens.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, chironDecode, chironDecoderPrompt, chironOpsUsed, chironFindBlocks, chironSeparators,
} from './chiron';
import {
  ariadneEncode, buildOn, renderBest, planOrder, grammarCost,
  type Grammar, type BuildOut, type AriadneOptions,
} from './ariadne';

/* ---------------------------------------------------------------------------
 * 1. GRAMMAR SURGERY
 * ------------------------------------------------------------------------- */

export function cloneGrammar(g: Grammar): Grammar {
  return {
    symText: g.symText.slice(),
    seqOf: new Map(g.seqOf),
    blockOf: new Map(g.blockOf),
    seq: g.seq.map(r => ({ ...r, body: r.body.slice() })),
    blocks: g.blocks.map(b => ({ ...b, lists: b.lists.slice() })),
    lists: g.lists.map(l => ({ ...l })),
    main: g.main.slice(),
  };
}

export function useCounts(g: Grammar): Map<number, number> {
  const uc = new Map<number, number>();
  const cnt = (seq: number[]) => { for (const x of seq) if (g.seqOf.has(x) || g.blockOf.has(x)) uc.set(x, (uc.get(x) ?? 0) + 1); };
  cnt(g.main);
  for (const r of g.seq) cnt(r.body);
  return uc;
}

export function inlineRule(g: Grammar, sid: number) {
  const si = g.seqOf.get(sid);
  if (si === undefined) return;
  const repl = g.seq[si].body;
  const sub = (seq: number[]) => { const o: number[] = []; for (const x of seq) { if (x === sid) o.push(...repl); else o.push(x); } return o; };
  g.main = sub(g.main);
  for (let i = 0; i < g.seq.length; i++) if (i !== si) g.seq[i].body = sub(g.seq[i].body);
  g.seq[si].body = [];
  g.seqOf.delete(sid);
}

/**
 * Spend the alphabet where it pays. The dense-graph scripts are small, so when
 * word rules are worth more than the weakest phrase rules the search has to be
 * able to give the phrase rules back.
 */
export function capPhraseRules(g: Grammar, cap: number) {
  for (let guard = 0; guard < 4000; guard++) {
    const live = [...g.seqOf].filter(([, si]) => g.seq[si].kind === 'macro' && g.seq[si].body.length >= 2);
    if (live.length <= cap) return;
    const uc = useCounts(g);
    let worst = -1;
    let worstVal = Infinity;
    for (const [sid, si] of live) {
      const u = uc.get(sid) ?? 0;
      const L = g.seq[si].body.length;
      const v = u * (L - 1) - L - 1;
      if (v < worstVal) { worstVal = v; worst = sid; }
    }
    if (worst < 0) return;
    inlineRule(g, worst);
  }
}

/**
 * Rank literal symbols by the ADJACENCY they would create, not by frequency.
 *
 * A single-token rule pays nothing on its own; it pays only when its reference
 * lands next to another reference, because that is the only way BPE gets a
 * same-script run to merge inside. So the right score for promoting symbol s is
 * "how many positions of s sit beside something that is already a reference (or
 * beside another copy of s)" — i.e. how much run length s creates. Ranking by
 * raw frequency promotes common tokens that happen to be isolated and wastes
 * both the alphabet and the tape.
 *
 * Greedy and re-scored in batches, because promoting s changes the adjacency of
 * everything next to s.
 */
export function rankByRunPotential(g: Grammar, limit: number): number[] {
  const seqs: number[][] = [g.main, ...g.seq.filter(r => r.body.length).map(r => r.body)];
  const isRef = (x: number) => g.seqOf.has(x) || g.blockOf.has(x);
  const promoted = new Set<number>();
  const out: number[] = [];
  const eligible = new Map<number, number>();
  for (const seq of seqs) for (const x of seq) if (!isRef(x) && g.symText[x]) eligible.set(x, (eligible.get(x) ?? 0) + 1);
  const pool = [...eligible.entries()].filter(([, c]) => c >= 2).map(([s2]) => s2);
  if (!pool.length) return out;

  const BATCH = 8;
  for (let round = 0; round < Math.ceil(limit / BATCH) && out.length < limit; round++) {
    const score = new Map<number, number>();
    const marked = (x: number) => isRef(x) || promoted.has(x);
    for (const seq of seqs) {
      for (let i = 0; i < seq.length; i++) {
        const x = seq[i];
        if (marked(x) || !eligible.has(x)) continue;
        let adj = 0;
        if (i > 0 && (marked(seq[i - 1]) || seq[i - 1] === x)) adj++;
        if (i + 1 < seq.length && (marked(seq[i + 1]) || seq[i + 1] === x)) adj++;
        // a symbol that never touches a reference still helps if two copies of
        // it are near each other, so give isolated occurrences a small weight
        score.set(x, (score.get(x) ?? 0) + adj * 4 + 1);
      }
    }
    const batch = [...score.entries()]
      .filter(([s2]) => !promoted.has(s2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(BATCH, limit - out.length));
    if (!batch.length) break;
    for (const [s2] of batch) { promoted.add(s2); out.push(s2); }
  }
  return out;
}

/**
 * THE ADMISSION THAT THE LITERATURE FORBIDS.
 * Each of these rules increases the symbol-space cost by exactly 2 and reduces
 * it by exactly 0. They are admitted only because the rendered wire, counted by
 * the live tokenizer after the assignment step, is shorter.
 */
export function addWordRules(g: Grammar, syms: number[]): number {
  let added = 0;
  for (const s of syms) {
    if (g.seqOf.has(s) || g.blockOf.has(s)) continue;
    if (!g.symText[s]) continue;
    const sid = g.symText.length;
    g.symText.push('');
    const si = g.seq.length;
    g.seqOf.set(sid, si);
    g.seq.push({ id: -1, kind: 'macro', body: [s] });
    const sub = (seq: number[]) => { let hit = false; const o = seq.map(x => { if (x === s) { hit = true; return sid; } return x; }); return hit ? o : seq; };
    g.main = sub(g.main);
    for (let i = 0; i < si; i++) g.seq[i].body = sub(g.seq[i].body);
    added++;
  }
  return added;
}

/* ---------------------------------------------------------------------------
 * 2. RESULT
 * ------------------------------------------------------------------------- */
export interface SibylResult {
  codec: 'sibyl';
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
  mode: 'sibyl' | 'raw' | 'forced-wrap';
  notes: string;
  /** message cost of the same grammar with ZERO word rules — the honest ablation */
  baselineM: number;
  assignmentGain: number;
}

export interface SibylOptions extends AriadneOptions {
  /** disable single-token rules entirely (ablation: reduces to ARIADNE) */
  noWords?: boolean;
  /** explicit word-rule counts to try */
  wordGrid?: number[];
  /** explicit phrase-rule caps to try (Infinity = uncapped) */
  capGrid?: number[];
}

function rawResult(text: string, enc: EncodingName, started: number): SibylResult {
  const inTokens = countTokens(text, enc);
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const wire = forced ? CHIRON_START + '¶' + text : text;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const out = forced ? countTokens(wire, enc) : inTokens;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'sibyl', wire, decoded: chironDecode(wire), exact: chironDecode(wire) === text,
    inTokens, outTokens: out, messageTokens, contractTokens: messageTokens - out,
    decoderPrompt: prompt, savingsPct: 0, phraseRules: 0, wordRules: 0, blocks: 0, lists: 0,
    script: 'none', ops: [], ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload is itself a decodable program; exact 2-token wrapper' : 'identity: no framing pays here',
    baselineM: messageTokens, assignmentGain: 0,
  };
}

/* ---------------------------------------------------------------------------
 * 3. ENCODER
 * ------------------------------------------------------------------------- */

interface Cand { out: BuildOut; M: number; words: number; cap: number; blocks: boolean }

export function sibylEncode(text: string, enc: EncodingName = 'o200k_base', options: SibylOptions = {}): SibylResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const raw = rawResult(text, enc, started);
  if (text.length < 16) return raw;

  // BUDGET FLOOR. The grammar phase is still bounded by wall-clock, so a budget
  // small enough to truncate it mid-search makes the emitted wire a function of
  // machine load. Red-team gate G10 caught exactly that. The floor guarantees the
  // grammar phase runs to its own natural stopping point; the assignment phase
  // above is already bounded by a probe count rather than by the clock.
  const floor = Math.min(4500, 400 + text.length * 0.35);
  const budgetMs = Math.max(options.budgetMs ?? Math.min(9000, 600 + text.length * 0.7), floor);
  const overall = started + Math.min(30_000, Math.round(budgetMs * 3.2));
  const base: Required<Omit<AriadneOptions, 'script' | 'sep'>> & { script?: string } = {
    budgetMs,
    maxSpan: options.maxSpan ?? 24,
    topK: options.topK ?? 8000,
    levels: options.levels ?? 6,
    noAssign: true,           // the grammar phase never needs the expensive step
    allowPolyglot: true,      // SIBYL is the codec that uses the pooled alphabet
    noSearch: options.noSearch ?? false,
    noBlocks: options.noBlocks ?? false,
    script: options.script,
  };

  /* ---- separator: cheap block-finder pre-pass, as in ARIADNE ---- */
  const seps = options.sep !== undefined ? [options.sep] : chironSeparators(text);
  let sep = seps[0];
  if (seps.length > 1 && !options.noBlocks) {
    const BL = ['@', '·', '¤', '†', '‡', '»', '«', '¦', '¬', '±', '°', 'µ', '★', '◆', '\u0001', '\u0002'];
    const blank = BL.find(c => countTokens(c, enc) === 1 && !text.includes(c));
    if (blank) {
      let bestGain = -1;
      for (const cand of seps) {
        let gain = 0;
        try { for (const b of chironFindBlocks(text, blank, cand, enc, Date.now() + 1000)) gain += b.gain; } catch { gain = -1; }
        if (gain > bestGain) { bestGain = gain; sep = cand; }
      }
    }
  }

  /* ---- one grammar per (blocks on/off); the word search reuses them ---- */
  const grammars: Array<{ g: Grammar; blocks: boolean }> = [];
  for (const trySep of [sep, ...seps.filter(x => x !== sep)]) {
    let g0: BuildOut | null = null;
    try { g0 = buildOn(text, enc, trySep, base, Math.min(overall, Date.now() + budgetMs)); } catch { g0 = null; }
    if (!g0) continue;                       // never give up on one separator
    grammars.push({ g: g0.g, blocks: g0.g.blocks.length > 0 });
    if (g0.g.blocks.length && !options.noBlocks && Date.now() < overall - 500) {
      let g1: BuildOut | null = null;
      try { g1 = buildOn(text, enc, trySep, { ...base, noBlocks: true }, Math.min(overall, Date.now() + budgetMs)); } catch { g1 = null; }
      if (g1) grammars.push({ g: g1.g, blocks: false });
    }
    break;
  }
  if (!grammars.length) return raw;

  const cands: Cand[] = [];
  const evaluate = (g: Grammar, words: number, cap: number, blocks: boolean, probeScale: number, tries: number, poly = true): Cand | null => {
    const plan = planOrder(g);
    if (!plan) return null;
    let out: BuildOut | null = null;
    try {
      out = renderBest(g, text, enc, { script: options.script, noAssign: false, budgetMs, probeScale, scriptTries: tries, allowPolyglot: poly },
        Math.min(overall, Date.now() + Math.max(500, budgetMs)), grammarCost(g, enc), 0);
    } catch { out = null; }
    if (!out) return null;
    if (chironDecode(out.wire) !== text) return null;
    const M = countTokens(chironDecoderPrompt(out.wire), enc);
    const c: Cand = { out, M, words, cap, blocks };
    cands.push(c);
    return c;
  };

  /* ---- search order matters: the parity arms go FIRST ----
   *
   * Every arm shares one wall-clock envelope, and the assignment hill-climb is
   * deadline-bounded, so an arm scheduled last silently gets a worse assignment
   * than the same arm scheduled first. Running the ARIADNE-parity configuration
   * last is exactly how SIBYL managed to lose gh-api.json by 21 tokens to the
   * codec it extends. Parity first, then the pooled alphabet, then the words. */
  const wordGrid = options.noWords ? [0] : (options.wordGrid ?? [24, 48]);
  const capGrid = options.capGrid ?? [Infinity];

  const prepared: Array<{ g: Grammar; blocks: boolean; ranked: number[] }> = [];
  for (const gr of grammars) {
    const maxW = Math.max(0, ...wordGrid);
    prepared.push({ g: gr.g, blocks: gr.blocks, ranked: maxW ? rankByRunPotential(gr.g, maxW) : [] });
  }

  // 1. The pooled alphabet with no word rules — isolates how much of the gain is
  //    the alphabet and how much is the new rule class.
  for (const pr of prepared) evaluate(cloneGrammar(pr.g), 0, -1, pr.blocks, 0.8, 3, true);
  // 2. Word rules: coarse sweep, then refine the best.
  const coarse: Array<{ g: Grammar; words: number; cap: number; blocks: boolean; M: number }> = [];
  for (const pr of prepared) {
    for (const cap of capGrid) {
      const gCap = cloneGrammar(pr.g);
      if (isFinite(cap)) capPhraseRules(gCap, cap);
      for (const w of wordGrid) {
        if (w > pr.ranked.length) continue;
        const g2 = cloneGrammar(gCap);
        addWordRules(g2, pr.ranked.slice(0, w));
        const c = evaluate(g2, w, isFinite(cap) ? cap : -1, pr.blocks, 0.2, 2);
        if (c) coarse.push({ g: g2, words: w, cap: isFinite(cap) ? cap : -1, blocks: pr.blocks, M: c.M });
      }
    }
  }
  coarse.sort((x, y) => x.M - y.M);
  for (const cfg of coarse.slice(0, 2)) evaluate(cfg.g, cfg.words, cfg.cap, cfg.blocks, 1, 3);
  if (!cands.length) return raw;

  cands.sort((a, b) => a.M - b.M || a.out.tokens - b.out.tokens);
  let best = cands[0];
  const zeroWord = cands.filter(c => c.words === 0).sort((a, b) => a.M - b.M)[0];

  /* ---- SIBYL is a SUPERSET SEARCH, and says so ----
   * Every arm above shares one deadline, and the assignment hill-climb is
   * time-bounded, so an unlucky schedule can hand back a worse assignment than
   * ARIADNE would have found for the same grammar. Rather than hope the
   * schedule is lucky, run ARIADNE and take it if it wins. A codec that can lose
   * to the codec it extends is not an improvement, and "usually better" is not a
   * property you can gate on. */
  let fromAriadne: ReturnType<typeof ariadneEncode> | null = null;
  try { fromAriadne = ariadneEncode(text, enc, { budgetMs, maxSpan: base.maxSpan, topK: base.topK, levels: base.levels }); } catch { fromAriadne = null; }
  if (fromAriadne && fromAriadne.mode === 'ariadne' && fromAriadne.messageTokens < best.M) {
    return {
      codec: 'sibyl', wire: fromAriadne.wire, decoded: fromAriadne.decoded, exact: fromAriadne.exact,
      inTokens, outTokens: fromAriadne.outTokens, messageTokens: fromAriadne.messageTokens,
      contractTokens: fromAriadne.contractTokens, decoderPrompt: fromAriadne.decoderPrompt,
      savingsPct: fromAriadne.savingsPct, phraseRules: fromAriadne.rules, wordRules: 0,
      blocks: fromAriadne.blocks, lists: fromAriadne.lists, script: fromAriadne.script,
      ops: fromAriadne.ops, ms: Date.now() - started, mode: 'sibyl',
      notes: `no admissible single-token rule set beat the plain grammar here; fell back to the ARIADNE arm (${fromAriadne.notes})`,
      baselineM: fromAriadne.messageTokens, assignmentGain: fromAriadne.assignmentGain,
    };
  }
  void best;
  best = cands[0];

  if (best.M >= inTokens) {
    return { ...raw, notes: `${raw.notes}; message gate: framed ${best.M} >= raw ${inTokens} (wire ${best.out.tokens})` };
  }

  const prompt = chironDecoderPrompt(best.out.wire);
  const u = chironOpsUsed(best.out.wire);
  const ops: string[] = [];
  if (u.rules) ops.push('rules');
  if (u.rep) ops.push('repeat');
  if (u.fill) ops.push('fill');
  if (u.range) ops.push('range');
  if (u.split) ops.push('list');
  const g = best.out.g;
  const wordCount = best.words;
  const phraseCount = [...g.seqOf].filter(([, si]) => g.seq[si].body.length >= 2).length;
  return {
    codec: 'sibyl',
    wire: best.out.wire,
    decoded: chironDecode(best.out.wire),
    exact: true,
    inTokens,
    outTokens: best.out.tokens,
    messageTokens: best.M,
    contractTokens: best.M - best.out.tokens,
    decoderPrompt: prompt,
    savingsPct: inTokens ? Math.round((1 - best.M / inTokens) * 1000) / 10 : 0,
    phraseRules: phraseCount,
    wordRules: wordCount,
    blocks: g.blocks.length,
    lists: g.lists.length,
    script: best.out.scriptName,
    ops,
    ms: Date.now() - started,
    mode: 'sibyl',
    notes: `${phraseCount} phrase rules + ${wordCount} single-token rules (cap=${best.cap < 0 ? 'none' : best.cap}), ${g.blocks.length} blocks, ${g.lists.length} lists; script=${best.out.scriptName}; assignment -${best.out.assignmentGain}; word rules -${(zeroWord ? zeroWord.M : best.M) - best.M} tokens vs the same search with none; contract=${best.M - best.out.tokens}`,
    baselineM: zeroWord ? zeroWord.M : best.M,
    assignmentGain: best.out.assignmentGain,
  };
}

/** Decoding is CHIRON's, verbatim: SIBYL emits the same wire language. */
export const sibylDecode = chironDecode;
export const sibylDecoderPrompt = chironDecoderPrompt;
