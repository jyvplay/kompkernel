/**
 * PALIMPSEST — write the manuscript many ways, keep the shortest.
 * =============================================================================
 *
 * WHAT FIVE TURNS OF MEASUREMENT ESTABLISHED
 * -----------------------------------------------------------------------------
 * The dictionary/grammar/merge class is exhausted, and that is proven, not
 * suspected:
 *
 *   · 55-75% of every emitted wire is LITERAL text covered by no rule, and the
 *     entire remaining pairwise-merge prize across the five largest lanes is
 *     446 tokens — 25 of them on gh-prose (bench/tmp/head.ts). Zipf explains it:
 *     40-60% of word types in any corpus are hapax legomena.
 *   · Character-level, non-token-aligned candidates — the class this stack
 *     rejected on a BOUND in its first turn — were re-tested with an EXACT
 *     evaluator: 4 918 evaluated candidates across five lanes produced SEVEN
 *     tokens (bench/tmp/charpolish.ts). The rejection was correct.
 *
 * So the remaining gains are not in a new operator. They are in the fact that
 * the SEARCH ITSELF has hyperparameters, and nobody has ever treated them as
 * decision variables.
 *
 * THE MEASUREMENT THAT MOTIVATES THIS FILE (bench/tmp/abl.ts)
 * -----------------------------------------------------------------------------
 * Running ARIADNE with single hyperparameters changed, on four lanes:
 *
 *     lane      default M   maxSpan=12   levels=1   topK=800
 *     gh-api         1171       1153 ★       1161       1169
 *     doc11          2658       2648 ★       2663       2654
 *     dts0           2172       2190         2181       2171 ★
 *     gh-prose       1827       1827         1825 ★     1827
 *
 * The default is beaten on every lane, by a different setting on every lane,
 * by up to 18 tokens. There is no single good configuration — there is a good
 * configuration PER INPUT, and the only way to know which is to measure.
 *
 * That was unaffordable until this turn's other change: candidate generation by
 * suffix automaton is 38-43x faster than the old (position, length) sweep
 * (bench/tmp/prof.ts), and the miner is called ~30 times per encode. Cheap
 * mining is what makes running the whole configuration portfolio possible.
 *
 * WHAT PALIMPSEST IS
 * -----------------------------------------------------------------------------
 * An anytime portfolio encoder. It evaluates a sequence of complete
 * configurations — span limit, level count, candidate cap, single-token rule
 * count, block pass on/off — scores each on the ONLY metric that matters (the
 * whole one-chat message), and keeps the shortest. The portfolio is ordered so
 * that the strongest known default runs first, which means the encoder always
 * holds a good answer and the caller can cut it off at any point.
 *
 * It is also its own regression test: because every arm is scored on measured
 * M and the incumbent default is arm zero, PALIMPSEST can only tie or beat the
 * configuration the rest of the stack ships.
 *
 * WHAT IS UNCHANGED
 * -----------------------------------------------------------------------------
 * The wire language, the contract, and all three independent readers — the
 * library decoder, a reader written from the prose alone, and the CPython
 * reader in a separate process. A portfolio encoder emits the same kind of
 * program; the reader cannot tell which arm produced it, so the entire gain
 * costs zero contract tokens.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, chironDecode, chironDecoderPrompt, chironOpsUsed,
  chironFindBlocks, chironSeparators,
} from './chiron';
import { ariadneEncode, type AriadneOptions } from './ariadne';
import { sibylEncode } from './sibyl';

export interface PalimpsestResult {
  codec: 'palimpsest';
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
  mode: 'palimpsest' | 'raw' | 'forced-wrap';
  notes: string;
  assignmentGain: number;
  /** how many complete configurations were actually scored */
  armsRun: number;
  /** M of arm zero — the configuration the rest of the stack ships */
  defaultM: number;
  winningArm: string;
}

export interface PalimpsestOptions extends AriadneOptions {
  /** wall-clock envelope for the whole portfolio; arms stop being started after it */
  budgetMs?: number;
  /** restrict the portfolio (used by ablations) */
  maxArms?: number;
  probeScale?: number;
}

/** One complete configuration of the underlying search. */
interface Arm {
  tag: string;
  maxSpan: number;
  levels: number;
  topK: number;
  words: number;
  noBlocks: boolean;
}

/**
 * The portfolio, ordered by measured value. Arm 0 is the incumbent default, so
 * the encoder holds a stack-quality answer after the first arm and every later
 * arm can only improve it. Arms 1-2 are the two settings that beat the default
 * on the ablation; the rest broaden the span/level/cap axes and add the
 * single-token rule class that SIBYL introduced.
 */
const PORTFOLIO: Arm[] = [
  { tag: 'default', maxSpan: 24, levels: 6, topK: 8000, words: 0, noBlocks: false },
  { tag: 'span12', maxSpan: 12, levels: 6, topK: 8000, words: 0, noBlocks: false },
  { tag: 'span12+words', maxSpan: 12, levels: 6, topK: 8000, words: 24, noBlocks: false },
  { tag: 'words', maxSpan: 24, levels: 6, topK: 8000, words: 24, noBlocks: false },
  { tag: 'flat', maxSpan: 24, levels: 1, topK: 8000, words: 0, noBlocks: false },
  { tag: 'span36', maxSpan: 36, levels: 6, topK: 8000, words: 0, noBlocks: false },
  { tag: 'capK', maxSpan: 24, levels: 6, topK: 1200, words: 0, noBlocks: false },
  { tag: 'span12+flat', maxSpan: 12, levels: 2, topK: 8000, words: 0, noBlocks: false },
];

function rawResult(text: string, enc: EncodingName, started: number): PalimpsestResult {
  const inTokens = countTokens(text, enc);
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const wire = forced ? CHIRON_START + CHIRON_SEP + text : text;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const out = forced ? countTokens(wire, enc) : inTokens;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'palimpsest', wire, decoded: chironDecode(wire), exact: chironDecode(wire) === text,
    inTokens, outTokens: out, messageTokens, contractTokens: messageTokens - out,
    decoderPrompt: prompt, savingsPct: 0, phraseRules: 0, wordRules: 0, blocks: 0, lists: 0,
    script: 'none', ops: [], ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload is itself a decodable program; exact 2-token wrapper' : 'identity: no framing pays here',
    assignmentGain: 0, armsRun: 0, defaultM: messageTokens, winningArm: 'none',
  };
}

interface Cand { wire: string; tokens: number; M: number; arm: Arm; gain: number; phrase: number; blocks: number; lists: number; script: string }

export function palimpsestEncode(text: string, enc: EncodingName = 'o200k_base', options: PalimpsestOptions = {}): PalimpsestResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const raw = rawResult(text, enc, started);
  if (text.length < 16) return raw;

  const budgetMs = options.budgetMs ?? Math.min(26_000, 1500 + text.length * 1.6);
  const deadline = started + budgetMs;
  const maxArms = options.maxArms ?? PORTFOLIO.length;

  /* separator: cheap block-finder pre-pass, with fallback. A separator whose
   * chunking the tokenizer does not reconstruct must never cost the whole
   * encode (measured previously on holdout/readme.txt: 843 instead of 684). */
  const seps = options.sep !== undefined ? [options.sep] : chironSeparators(text);
  let sep = seps[0];
  if (seps.length > 1 && !options.noBlocks) {
    const BL = ['@', '·', '¤', '†', '‡', '»', '«', '¦', '¬', '±', '°', 'µ', '★', '◆', '\u0001', '\u0002'];
    const blank = BL.find(c => countTokens(c, enc) === 1 && !text.includes(c));
    if (blank) {
      let bestGain = -1;
      for (const cand of seps) {
        let gain = 0;
        try { for (const b of chironFindBlocks(text, blank, cand, enc, Date.now() + 800)) gain += b.gain; } catch { gain = -1; }
        if (gain > bestGain) { bestGain = gain; sep = cand; }
      }
    }
  }
  const sepOrder = [sep, ...seps.filter(x => x !== sep)];

  const cands: Cand[] = [];
  let armsRun = 0;

  /* Each arm is the INCUMBENT encoder with its hyperparameters overridden.
   * An earlier revision re-plumbed buildOn/renderBest by hand and arm zero
   * silently stopped reproducing ARIADNE — dts0 came back at 3973 against
   * ARIADNE's 2172. Calling the shipped encoder makes arm zero identical to the
   * incumbent by construction, which is the only way "the portfolio can only
   * tie or beat the default" is actually true rather than intended. */
  const runArm = (arm: Arm) => {
    let r: { wire: string; outTokens: number; messageTokens: number; decoded: string; mode: string; rules?: number; phraseRules?: number; blocks: number; lists: number; script: string; assignmentGain: number } | null = null;
    try {
      r = arm.words > 0
        ? sibylEncode(text, enc, { maxSpan: arm.maxSpan, levels: arm.levels, topK: arm.topK, noBlocks: arm.noBlocks || !!options.noBlocks, sep: options.sep, wordGrid: [arm.words] }) as any
        : ariadneEncode(text, enc, { maxSpan: arm.maxSpan, levels: arm.levels, topK: arm.topK, noBlocks: arm.noBlocks || !!options.noBlocks, sep: options.sep }) as any;
    } catch { r = null; }
    if (!r) return;
    armsRun++;
    if (r.mode !== 'ariadne' && r.mode !== 'sibyl') return;      // arm declined
    if (r.decoded !== text || chironDecode(r.wire) !== text) return;
    cands.push({
      wire: r.wire, tokens: r.outTokens, M: r.messageTokens, arm, gain: r.assignmentGain,
      phrase: (r.phraseRules ?? r.rules ?? 0), blocks: r.blocks, lists: r.lists, script: r.script,
    });
  };

  for (let i = 0; i < Math.min(maxArms, PORTFOLIO.length); i++) {
    if (i > 0 && Date.now() > deadline) break;
    runArm(PORTFOLIO[i]);
  }
  if (!cands.length) return raw;

  cands.sort((a, b) => a.M - b.M || a.tokens - b.tokens);
  const best = cands[0];
  const def = cands.find(c => c.arm.tag === 'default');
  if (best.M >= inTokens) {
    return { ...raw, notes: `${raw.notes}; message gate: best of ${armsRun} arms is ${best.M} >= raw ${inTokens} (wire ${best.tokens})` };
  }
  const u = chironOpsUsed(best.wire);
  const ops: string[] = [];
  if (u.rules) ops.push('rules');
  if (u.rep) ops.push('repeat');
  if (u.fill) ops.push('fill');
  if (u.range) ops.push('range');
  if (u.split) ops.push('list');
  return {
    codec: 'palimpsest',
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
    wordRules: best.arm.words,
    blocks: best.blocks,
    lists: best.lists,
    script: best.script,
    ops,
    ms: Date.now() - started,
    mode: 'palimpsest',
    notes: `portfolio: ${armsRun} arms scored, winner "${best.arm.tag}" (span=${best.arm.maxSpan} levels=${best.arm.levels} topK=${best.arm.topK} words=${best.arm.words}); ${best.phrase} phrase rules, ${best.blocks} blocks, ${best.lists} lists; script=${best.script}; assignment -${best.gain}; portfolio beat the default arm by ${(def ? def.M : best.M) - best.M}; contract=${best.M - best.tokens}`,
    assignmentGain: best.gain,
    armsRun,
    defaultM: def ? def.M : best.M,
    winningArm: best.arm.tag,
  };
}

export const palimpsestDecode = chironDecode;
export const palimpsestDecoderPrompt = chironDecoderPrompt;
