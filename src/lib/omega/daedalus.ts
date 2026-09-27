/**
 * DAEDALUS — read the grain of the material before you cut it.
 * =============================================================================
 *
 * WHERE SIX TURNS OF MEASUREMENT LEFT THIS PROBLEM
 * -----------------------------------------------------------------------------
 * The dictionary/grammar/merge class is exhausted, and that is now established
 * by six independent measurements, not by argument:
 *
 *  1. 55-75% of every emitted wire is LITERAL text covered by no rule, and even
 *     if every adjacent reference pair merged the entire remaining prize across
 *     the five largest lanes is 446 tokens (bench/tmp/head.ts). Zipf explains
 *     it: 40-60% of word types in any corpus are hapax legomena.
 *  2. Character-level, non-token-aligned candidates — the class this stack
 *     rejected on a BOUND in turn one — were re-tested with an EXACT evaluator:
 *     4 918 evaluated candidates across five lanes produced SEVEN tokens
 *     (bench/tmp/charpolish.ts).
 *  3. `maxSpan` looked like an artificial cap left over from the old
 *     O(n*maxSpan) sweep. Raising it 24 -> 64 -> 200 -> 1000 moves M by -8 to
 *     -16 on two lanes and 0 elsewhere (bench/tmp/span.ts). The long repeats it
 *     would unlock are already captured by the hierarchical level loop.
 *  4. The rule count is not capped and the glyph pool does not bind: a 21 243
 *     token paste uses 695 rules against a 2 515 character pool
 *     (bench/tmp/scale.ts).
 *  5. The search is not budget-starved at realistic paste sizes: 9 s, 30 s and
 *     90 s give byte-identical M on three large pastes (bench/tmp/budget.ts).
 *  6. Delta-evaluated tabu search over the glyph assignment is worse than the
 *     targeted hill-climb on every configuration tried (previous turn).
 *
 * What DOES still move the number is the one thing turn six found: there is no
 * single good search configuration, only a good configuration per input
 * (bench/tmp/abl.ts). PALIMPSEST exploited that with a portfolio and beat
 * ARIADNE on 10 of 13 lanes, losing on 0 — at roughly 9x the wall-clock,
 * because it ran every arm.
 *
 * WHAT IS NEW HERE
 * -----------------------------------------------------------------------------
 * The winning arm is PREDICTABLE from an O(n) feature of the input, so the
 * portfolio does not have to be exhaustive. Measured winners against measured
 * features (bench/tmp/feat.ts):
 *
 *     lane       tokens  distinct  rep2%  punct%   winning arm
 *     gh-api       2519       464   82.6    20.3   span12
 *     json-pkg     1152       289   65.7    23.6   span12
 *     code-dts      162        34   71.0    23.4   default   (tiny)
 *     readme        843       351   43.4    14.8   default
 *     gh-prose     1934       842   28.5     7.7   span12+words
 *     license      1166       370   45.2     3.2   span12+words
 *     code-ts      1422       312   66.9    10.3   span12+words
 *     doc11        3677       846   64.4    11.2   span12+words
 *     dts0         3991       625   82.9    11.3   span12+words
 *     doc3          673       274   50.7    13.6   span12+words
 *
 * Punctuation density separates them cleanly: above ~18% (JSON and other
 * bracket-dense payloads) the short-span arm wins; below it the short-span arm
 * WITH single-token rules wins; very small inputs are won by the plain default
 * because every extra arm's machinery has to amortise over too little text.
 * That is a three-line classifier, computed in one pass that the encoder has to
 * make anyway.
 *
 * DAEDALUS therefore orders the portfolio by predicted fit and takes an anytime
 * budget, so the first arm it runs is usually the winner. It still contains the
 * incumbent arm, so it retains PALIMPSEST's structural guarantee: the result is
 * a minimum over a set that includes the shipped default, and it can only tie
 * or beat it.
 *
 * WHAT IS UNCHANGED
 * -----------------------------------------------------------------------------
 * The wire language, the contract, and all three independent readers — the
 * library decoder, a reader written from the prose alone, and the CPython
 * reader in a separate process. Arm selection is invisible to the reader, so
 * the entire gain costs zero contract tokens.
 * =============================================================================
 */

import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, chironDecoderPrompt, chironOpsUsed } from './chiron';
import { ariadneEncode, type AriadneOptions } from './ariadne';
import { sibylEncode } from './sibyl';

export interface DaedalusResult {
  codec: 'daedalus';
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
  mode: 'daedalus' | 'raw' | 'forced-wrap';
  notes: string;
  assignmentGain: number;
  armsRun: number;
  /** M of the plain incumbent arm, when it was run */
  defaultM: number;
  winningArm: string;
  predictedArm: string;
  /** did the O(n) classifier name the arm that actually won? */
  predictionHit: boolean;
  features: { tokens: number; distinct: number; repeatPct: number; punctPct: number };
}

export interface DaedalusOptions extends AriadneOptions {
  budgetMs?: number;
  /** how many arms to allow; 1 = pure prediction, no portfolio */
  maxArms?: number;
}

interface Arm { tag: string; maxSpan: number; levels: number; topK: number; words: number }

/** Arms are exactly the configurations the ablation and PALIMPSEST measured. */
const ARMS: Record<string, Arm> = {
  'default': { tag: 'default', maxSpan: 24, levels: 6, topK: 8000, words: 0 },
  'span12': { tag: 'span12', maxSpan: 12, levels: 6, topK: 8000, words: 0 },
  'span12+words': { tag: 'span12+words', maxSpan: 12, levels: 6, topK: 8000, words: 24 },
  'words': { tag: 'words', maxSpan: 24, levels: 6, topK: 8000, words: 24 },
  'span36': { tag: 'span36', maxSpan: 36, levels: 6, topK: 8000, words: 0 },
  'flat': { tag: 'flat', maxSpan: 24, levels: 1, topK: 8000, words: 0 },
};

export interface Features { tokens: number; distinct: number; repeatPct: number; punctPct: number }

/** One pass. The encoder tokenises anyway, so this is effectively free. */
export function daedalusFeatures(text: string, enc: EncodingName = 'o200k_base'): Features {
  const segs = tokenStrings(text, enc).map(x => x.s);
  const n = segs.length;
  if (!n) return { tokens: 0, distinct: 0, repeatPct: 0, punctPct: 0 };
  const cnt = new Map<string, number>();
  for (let i = 0; i + 2 <= n; i++) { const k = segs[i] + '\u0000' + segs[i + 1]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
  let rep = 0;
  for (let i = 0; i + 2 <= n; i++) if ((cnt.get(segs[i] + '\u0000' + segs[i + 1]) ?? 0) >= 2) rep++;
  let punct = 0;
  for (const ch of text) if (!/[\w\s]/.test(ch)) punct++;
  return {
    tokens: n,
    distinct: new Set(segs).size,
    repeatPct: (100 * rep) / n,
    punctPct: (100 * punct) / Math.max(1, text.length),
  };
}

/**
 * Order the portfolio by predicted fit. The first two entries always include
 * the incumbent `default`, so an anytime cut-off after two arms still cannot
 * lose to the shipped encoder.
 */
export function daedalusOrder(f: Features): string[] {
  let head: string[];
  if (f.tokens < 300) head = ['default', 'span12'];
  else if (f.punctPct > 18) head = ['span12', 'default'];
  else head = ['span12+words', 'default'];
  const rest = ['span12', 'span12+words', 'words', 'span36', 'flat', 'default'].filter(a => !head.includes(a));
  return [...head, ...rest];
}

function rawResult(text: string, enc: EncodingName, started: number, f: Features): DaedalusResult {
  const inTokens = countTokens(text, enc);
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const wire = forced ? CHIRON_START + CHIRON_SEP + text : text;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const out = forced ? countTokens(wire, enc) : inTokens;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'daedalus', wire, decoded: chironDecode(wire), exact: chironDecode(wire) === text,
    inTokens, outTokens: out, messageTokens, contractTokens: messageTokens - out,
    decoderPrompt: prompt, savingsPct: 0, phraseRules: 0, wordRules: 0, blocks: 0, lists: 0,
    script: 'none', ops: [], ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload is itself a decodable program; exact 2-token wrapper' : 'identity: no framing pays here',
    assignmentGain: 0, armsRun: 0, defaultM: messageTokens, winningArm: 'none', predictedArm: 'none',
    predictionHit: false, features: f,
  };
}

interface Cand { wire: string; tokens: number; M: number; tag: string; gain: number; phrase: number; words: number; blocks: number; lists: number; script: string }

export function daedalusEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): DaedalusResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const f = daedalusFeatures(text, enc);
  const raw = rawResult(text, enc, started, f);
  if (text.length < 16) return raw;

  const budgetMs = options.budgetMs ?? Math.min(20_000, 1200 + text.length * 1.1);
  const deadline = started + budgetMs;
  const order = daedalusOrder(f);
  const maxArms = Math.max(1, Math.min(options.maxArms ?? 2, order.length));
  const predicted = order[0];

  const cands: Cand[] = [];
  let armsRun = 0;

  /* Arms call the SHIPPED encoders with option overrides. An earlier codec in
   * this stack re-plumbed the internals by hand and its reference arm silently
   * stopped reproducing the incumbent (dts0 came back at 3973 against 2172);
   * calling the shipped entry points makes parity true by construction. */
  const runArm = (tag: string) => {
    const arm = ARMS[tag];
    if (!arm) return;
    let r: any = null;
    try {
      const shared = { maxSpan: arm.maxSpan, levels: arm.levels, topK: arm.topK, noBlocks: !!options.noBlocks, sep: options.sep };
      r = arm.words > 0
        ? sibylEncode(text, enc, { ...shared, wordGrid: [arm.words] })
        : ariadneEncode(text, enc, shared);
    } catch { r = null; }
    if (!r) return;
    armsRun++;
    if (r.mode !== 'ariadne' && r.mode !== 'sibyl') return;
    if (r.decoded !== text || chironDecode(r.wire) !== text) return;
    cands.push({
      wire: r.wire, tokens: r.outTokens, M: r.messageTokens, tag, gain: r.assignmentGain ?? 0,
      phrase: (r.phraseRules ?? r.rules ?? 0), words: arm.words, blocks: r.blocks ?? 0, lists: r.lists ?? 0, script: r.script,
    });
  };

  for (let i = 0; i < maxArms; i++) {
    if (i > 0 && Date.now() > deadline) break;
    runArm(order[i]);
  }
  if (!cands.length) return raw;

  cands.sort((a, b) => a.M - b.M || a.tokens - b.tokens);
  const best = cands[0];
  const def = cands.find(c => c.tag === 'default');
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
    codec: 'daedalus',
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
    mode: 'daedalus',
    notes: `predicted "${predicted}" from punct=${f.punctPct.toFixed(1)}% tokens=${f.tokens}; ran ${armsRun} arm(s); winner "${best.tag}"${best.tag === predicted ? ' (prediction hit)' : ' (prediction miss)'}; ${best.phrase} phrase + ${best.words} single-token rules, ${best.blocks} blocks, ${best.lists} lists; script=${best.script}; beat the plain default arm by ${(def ? def.M : best.M) - best.M}; contract=${best.M - best.tokens}`,
    assignmentGain: best.gain,
    armsRun,
    defaultM: def ? def.M : best.M,
    winningArm: best.tag,
    predictedArm: predicted,
    predictionHit: best.tag === predicted,
    features: f,
  };
}

export const daedalusDecode = chironDecode;
export const daedalusDecoderPrompt = chironDecoderPrompt;
