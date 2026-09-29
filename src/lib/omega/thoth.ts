/**
 * THOTH — the scribe who writes at the speed of reckoning.
 * =============================================================================
 *
 * WHAT THIS TURN ESTABLISHED, BEFORE ANY CODE
 * -----------------------------------------------------------------------------
 * Two measurements bound what is left in this problem, and both are negative.
 *
 *  1. THE DICTIONARY CLASS IS CLOSED (bench/tmp/head.ts, previous turn).
 *     Decomposing real wires: 55-75% of every wire is LITERAL text covered by
 *     no rule, and even if every adjacent reference pair merged, the entire
 *     remaining prize across the five largest lanes is 446 tokens — 25 of them
 *     on gh-prose. Zipf explains it: 40-60% of word types in any corpus are
 *     hapax legomena, and a hapax cannot be dictionary-coded.
 *
 *  2. THE STACK'S FOUNDING ASSUMPTION IS CORRECT (bench/tmp/charpolish.ts,
 *     this turn). HERMES-Ω rejected character-level (non-token-aligned)
 *     candidates on the basis of a BOUND. We re-tested that rejection with an
 *     EXACT evaluator — render the wire, count it, keep only if it shrinks —
 *     and applied it as a polish pass on top of finished wires:
 *
 *         lane      wire   after polish   Δ    rules admitted / evaluated
 *         gh-prose  1787         1784    -3          1 / 1400
 *         license    980          980     0          0 /  700
 *         readme     645          645     0          0 /  515
 *         code-ts   1043         1039    -4          4 / 2030
 *         doc3       501          501     0          0 /  273
 *
 *     Four thousand nine hundred exactly-evaluated character-level candidates
 *     across five lanes yield seven tokens. The bound was not the problem; the
 *     candidates genuinely do not pay.
 *
 * So the remaining axis is the one the brief also names: SPEED. And there the
 * headroom turned out to be large, because the encoder was spending its time in
 * a place nobody had profiled.
 *
 * WHAT IS NEW
 * -----------------------------------------------------------------------------
 *  1. CANDIDATE GENERATION BY SUFFIX AUTOMATON (in `ariadne.ts`, shared).
 *     The sweep over every (position, length) pair with a freshly built string
 *     key was O(n·maxSpan) concatenations, re-run once per level AND once per
 *     greedy-add round — up to thirty times per encode. A suffix automaton's
 *     states are the right-equivalence classes of substrings, so states with
 *     occurrence count >= 2 ARE the maximal repeats, and the whole candidate set
 *     falls out in O(n) integer work. Measured (bench/tmp/prof.ts):
 *
 *         lane      sweep  automaton  speedup   best-candidate net
 *         dts0      300ms        8ms    37.5x   145 -> 145 (identical)
 *         doc11     198ms        5ms    39.6x    76 ->  76
 *         gh-prose  129ms        3ms    43.0x    20 ->  20
 *
 *     Fewer candidates, because only maximal repeats survive — which is also
 *     MR-RePair's result (Furuya et al., Algorithms 13(4):103, 2020).
 *
 *  2. OCCURRENCE INDEXING BY AHO-CORASICK (in `ariadne.ts`, shared). The DP
 *     needs, for each position, the candidates starting there. That was another
 *     O(n·maxSpan) string-key sweep per level. One automaton pass reports every
 *     occurrence in O(n + matches), exactly, with no hashing.
 *
 *  3. THOTH ITSELF: a deterministic, clock-free encoder that spends the freed
 *     budget on the full configuration grid in one pass. Every loop is bounded
 *     by an iteration count, never by `Date.now()`, so the emitted wire is a
 *     pure function of the input — the property SIBYL fails.
 *
 * WHAT IS UNCHANGED
 * -----------------------------------------------------------------------------
 * The wire language, the contract, and all three independent readers. A faster
 * encoder emits the same kind of program; the reader cannot tell.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, chironDecode, chironDecoderPrompt, chironOpsUsed,
  chironFindBlocks, chironSeparators,
} from './chiron';
import {
  buildOn, renderBest, grammarCost,
  type Grammar, type BuildOut, type AriadneOptions,
} from './ariadne';
import { cloneGrammar, addWordRules, rankByRunPotential } from './sibyl';

/** A deadline the iteration caps can never reach: the clock stops mattering. */
const NO_CLOCK = 8.64e15;

export interface ThothResult {
  codec: 'thoth';
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
  mode: 'thoth' | 'raw' | 'forced-wrap';
  notes: string;
  assignmentGain: number;
  arms: number;
}

export interface ThothOptions extends AriadneOptions {
  noWords?: boolean;
  wordGrid?: number[];
  probeScale?: number;
}

function rawResult(text: string, enc: EncodingName, started: number): ThothResult {
  const inTokens = countTokens(text, enc);
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const wire = forced ? CHIRON_START + CHIRON_SEP + text : text;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const out = forced ? countTokens(wire, enc) : inTokens;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'thoth', wire, decoded: chironDecode(wire), exact: chironDecode(wire) === text,
    inTokens, outTokens: out, messageTokens, contractTokens: messageTokens - out,
    decoderPrompt: prompt, savingsPct: 0, phraseRules: 0, wordRules: 0, blocks: 0, lists: 0,
    script: 'none', ops: [], ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload is itself a decodable program; exact 2-token wrapper' : 'identity: no framing pays here',
    assignmentGain: 0, arms: 0,
  };
}

interface Cand { wire: string; tokens: number; M: number; words: number; script: string; gain: number; phrase: number; blocks: number; lists: number }

export function thothEncode(text: string, enc: EncodingName = 'o200k_base', options: ThothOptions = {}): ThothResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const raw = rawResult(text, enc, started);
  if (text.length < 16) return raw;

  const base: Required<Omit<AriadneOptions, 'script' | 'sep'>> & { script?: string } = {
    budgetMs: 1,                 // unused: NO_CLOCK is the deadline
    maxSpan: options.maxSpan ?? 24,
    topK: options.topK ?? 8000,
    levels: options.levels ?? 6,
    noAssign: true,
    noSearch: options.noSearch ?? false,
    noBlocks: options.noBlocks ?? false,
    allowPolyglot: true,
    script: options.script,
  };

  /* separator selection: a cheap block-finder pre-pass, with fallback so that a
   * separator whose chunking the tokenizer does not reconstruct never costs the
   * whole encode (measured previously on holdout/readme.txt: 843 instead of 684). */
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

  const grammars: Array<{ g: Grammar }> = [];
  for (const trySep of [sep, ...seps.filter(x => x !== sep)]) {
    let g0: BuildOut | null = null;
    try { g0 = buildOn(text, enc, trySep, base, NO_CLOCK); } catch { g0 = null; }
    if (!g0) continue;
    grammars.push({ g: g0.g });
    if (g0.g.blocks.length && !options.noBlocks) {
      let g1: BuildOut | null = null;
      try { g1 = buildOn(text, enc, trySep, { ...base, noBlocks: true }, NO_CLOCK); } catch { g1 = null; }
      if (g1) grammars.push({ g: g1.g });
    }
    break;
  }
  if (!grammars.length) return raw;

  const cands: Cand[] = [];
  const evaluate = (g: Grammar, words: number, probeScale: number, tries: number) => {
    let out: BuildOut | null = null;
    try {
      out = renderBest(g, text, enc,
        { script: options.script, noAssign: false, budgetMs: 1, probeScale, scriptTries: tries, allowPolyglot: true },
        NO_CLOCK, grammarCost(g, enc), 0);
    } catch { out = null; }
    if (!out) return;
    if (chironDecode(out.wire) !== text) return;
    const M = countTokens(chironDecoderPrompt(out.wire), enc);
    const phrase = [...g.seqOf].filter(([, si]) => g.seq[si].body.length >= 2).length;
    cands.push({ wire: out.wire, tokens: out.tokens, M, words, script: out.scriptName, gain: out.assignmentGain, phrase, blocks: g.blocks.length, lists: g.lists.length });
  };

  const wordGrid = options.noWords ? [0] : (options.wordGrid ?? [0, 24]);
  for (const gr of grammars) {
    const maxW = Math.max(...wordGrid);
    const ranked = maxW ? rankByRunPotential(gr.g, maxW) : [];
    for (const w of wordGrid) {
      if (w > ranked.length) continue;
      const g2 = cloneGrammar(gr.g);
      if (w) addWordRules(g2, ranked.slice(0, w));
      evaluate(g2, w, options.probeScale ?? 0.30, 2);
    }
  }
  if (!cands.length) return raw;
  cands.sort((a, b) => a.M - b.M || a.tokens - b.tokens);
  const best = cands[0];
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
    codec: 'thoth',
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
    mode: 'thoth',
    notes: `clock-free deterministic; ${cands.length} arms; ${best.phrase} phrase + ${best.words} single-token rules, ${best.blocks} blocks, ${best.lists} lists; script=${best.script}; assignment -${best.gain}; word rules -${(zero ? zero.M : best.M) - best.M}; contract=${best.M - best.tokens}`,
    assignmentGain: best.gain,
    arms: cands.length,
  };
}

export const thothDecode = chironDecode;
export const thothDecoderPrompt = chironDecoderPrompt;
