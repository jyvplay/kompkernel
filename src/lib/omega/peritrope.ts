/**
 * PERITROPE (περιτροπή — "a turning round, a cycle, a revolution").
 *
 * X40. ANTISTROPHE (X39) established that a document can carry TOKENIZATION
 * WASTE that is orthogonal to redundancy: `src/omega/anadiplosis.ts` costs 8
 * tokens and `src omega anadiplosis.ts` costs 7, because a space merges forward
 * into the next token and disappears while a slash stands alone and is charged
 * for. It then fixed exactly ONE such exchange.
 *
 * One is an arbitrary stopping point. An exchange of two characters is a
 * transposition, and any permutation of an alphabet is a product of
 * transpositions — so the natural object is not a pair but a SEQUENCE of pairs,
 * and the natural question is how much the second, third and fourth are worth.
 *
 * Measured on the raw text (`bench/x40/screen1.ts`), they are worth a great
 * deal, and the returns are not obviously diminishing:
 *
 *     lane              1 swap    2 swaps   3 swaps
 *     find-listing       −166      −249      −264
 *     npm-ls             −131      −180      −200
 *     pom.xml             −18       −32       −33
 *     git-numstat        −408      −421      −425
 *
 * On pom.xml the THIRD exchange is worth more than the first two combined,
 * because each exchange changes the merge landscape the next one sees. This is
 * not a sequence of independent savings; it is a single permutation, and it has
 * to be searched as one.
 *
 * WHAT THIS CODEC DOES
 * ---------------------------------------------------------------------------
 * PERITROPE searches over SETS of character exchanges rather than over single
 * ones, and ships the set that minimises the measured message.
 *
 * Two constraints shape the search, and both exist for the reader's benefit
 * rather than the encoder's.
 *
 *   1. PAIRS ARE PAIRWISE DISJOINT. Two exchanges that share a character do not
 *      commute, so a decoder would have to undo them in reverse order — a real
 *      error surface for a language model working from a single chat message,
 *      since the failure is silent and produces fluent text. Disjoint pairs make
 *      the order irrelevant and the instruction a plain list. Measured cost of
 *      this constraint (`bench/x40/screen3.ts`): zero on twelve lanes, and 26
 *      raw tokens on find-listing, where the overlapping optimum is −264 and the
 *      disjoint beam reaches −238.
 *
 *   2. THE SEARCH IS A BEAM, NOT GREEDY PICK-ONE. Greedy is order-myopic: it
 *      takes the best single exchange, which can consume a character a later and
 *      better exchange needed. Measured, beam beats greedy disjoint by 57 raw
 *      tokens on find-listing (−238 vs −181), 25 on ls-full-iso (−36 vs −11)
 *      and 16 on pom.xml (−49 vs −33). This is the one place in this codec where
 *      an honest "is it greedy?" answer is NO for the pair auction and YES for
 *      the depth extension: each depth level keeps the best W partial solutions
 *      rather than one, so early mistakes are survivable, but the search is
 *      still a beam and not exhaustive.
 *
 * The clause lists the exchanges in one sentence and costs about two tokens per
 * additional pair: 5 for one, 7 for two, 9 for three, 12 for four. Whitespace is
 * NAMED, not emitted — X39's lesson, where the cheapest clause told the reader
 * to swap an invisible space.
 *
 * PERITROPE is a strict superset of ANTISTROPHE: ANTISTROPHE is PERITROPE with
 * the beam depth held at one. It cannot regress against it.
 *
 * Greedy: no for the pair auction (every candidate pair is priced on the real
 * token count of the text it produces) and no for the depth extension (a beam of
 * width 8 over 5 levels), but it is a beam rather than an exhaustive search over
 * permutations, which is factorial. Time and CPU bound: yes — the beam costs
 * ~400 tokenizations, measured at 6 s per lane across 18 lanes, and only the
 * winning permutation is carried through the stack, so encode time is the same
 * as ANTISTROPHE's, one parent encode plus one trial.
 */
import { countTokens, type EncodingName } from './bpe';
import { antistropheEncode, antistropheDecode, type AntistropheResult } from './antistrophe';

/** The structure-preserving pool, inherited unchanged from ANTISTROPHE. */
export const PERITROPE_POOL: string[] =
  (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']);

/**
 * A character qualifies for the pool if it occurs at all.
 *
 * This was originally a minimum-count filter of 20, inherited from
 * ANTISTROPHE, and it cost most of the gain: measured on the same beam,
 * git-numstat went from k=2/-421 with a presence filter to k=1/-408 with the
 * count filter, and npm-ls from k=5/-229 to k=1/-11. A character that occurs
 * eleven times can still be the expensive half of a very cheap pair. The
 * bound that matters is POOL_CAP, not a count threshold.
 */
export const PERITROPE_MIN_COUNT = 1;
/** Most frequent qualifying characters retained, bounding the pair count. */
export const PERITROPE_POOL_CAP = 22;
/** Beam width: how many partial permutations survive each depth level. */
export const PERITROPE_WIDTH = 8;
/** Maximum number of exchanges in the shipped permutation. */
export const PERITROPE_DEPTH = 5;
/** How many candidate pairs are priced at each beam node. */
export const PERITROPE_CAP = 10;
/** Hard cap on priced candidates, so a large document cannot dominate encode. */
export const PERITROPE_MAX_PRICED = 4000;

export type PeritropePair = [string, string];

export function peritropeSwap(text: string, a: string, b: string): string {
  const p1 = '\u0001', p2 = '\u0002';
  return text.split(a).join(p1).split(b).join(p2).split(p1).join(b).split(p2).join(a);
}

/** Apply a set of pairwise-disjoint exchanges. Order is irrelevant. */
export function peritropeApply(text: string, pairs: PeritropePair[]): string {
  let t = text;
  for (const [a, b] of pairs) t = peritropeSwap(t, a, b);
  return t;
}

interface Node {
  text: string;
  used: Set<string>;
  tot: number;
  chain: PeritropePair[];
}

/**
 * Beam search over sets of pairwise-disjoint character exchanges.
 *
 * Returns the cheapest chain found AT EACH DEPTH, because the depth is not free:
 * every additional pair costs about two clause tokens. Choosing the depth by
 * `rawDelta(k) + clauseTokens(k)` is both cheaper and more principled than
 * encoding every prefix and comparing, which would cost one full stack encode
 * per candidate depth.
 */
export function peritropeSearch(
  text: string,
  enc: EncodingName,
  opts: { width?: number; depth?: number; cap?: number } = {},
): { chains: PeritropePair[][]; deltas: number[]; priced: number } {
  const width = opts.width ?? PERITROPE_WIDTH;
  const depth = opts.depth ?? PERITROPE_DEPTH;
  const cap = opts.cap ?? PERITROPE_CAP;

  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const pool = PERITROPE_POOL
    .filter((c) => (freq.get(c) ?? 0) >= PERITROPE_MIN_COUNT)
    .sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0))
    .slice(0, PERITROPE_POOL_CAP);
  if (pool.length < 2) return { chains: [], deltas: [], priced: 0 };

  let priced = 0;
  let beam: Node[] = [{ text, used: new Set(), tot: 0, chain: [] }];
  const chains: PeritropePair[][] = [];
  const deltas: number[] = [];

  for (let d = 0; d < depth; d++) {
    const next: Node[] = [];
    for (const node of beam) {
      const base = countTokens(node.text, enc);
      const scored: Array<{ pair: PeritropePair; d: number }> = [];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const a = pool[i], b = pool[j];
          if (node.used.has(a) || node.used.has(b)) continue;
          const delta = countTokens(peritropeSwap(node.text, a, b), enc) - base;
          priced++;
          if (delta < 0) scored.push({ pair: [a, b], d: delta });
        }
      }
      if (priced > PERITROPE_MAX_PRICED) break;
      scored.sort((x, y) => x.d - y.d);
      for (const c of scored.slice(0, cap)) {
        const used = new Set(node.used);
        used.add(c.pair[0]); used.add(c.pair[1]);
        next.push({
          text: peritropeSwap(node.text, c.pair[0], c.pair[1]),
          used, tot: node.tot + c.d, chain: [...node.chain, c.pair],
        });
      }
    }
    if (!next.length) break;
    next.sort((x, y) => x.tot - y.tot);
    beam = next.slice(0, width);
    chains.push(beam[0].chain);
    deltas.push(beam[0].tot);
    if (priced > PERITROPE_MAX_PRICED) break;
  }
  return { chains, deltas, priced };
}

/** Whitespace is named, never emitted — X39's clause lesson. */
export function peritropeName(c: string): string {
  if (c === ' ') return 'space';
  if (c === '\t') return 'tab';
  return c;
}

/** One sentence listing every exchange. ~2 tokens per additional pair. */
export function peritropeClauseFor(pairs: PeritropePair[]): string {
  if (pairs.length === 1) {
    return `Then swap ${peritropeName(pairs[0][0])} and ${pairs[0][1]}.`;
  }
  const list = pairs.map(([a, b]) => `${peritropeName(a)} ${b}`).join(', ');
  return `Then swap ${list}.`;
}

export interface PeritropeResult extends AntistropheResult {
  peritrope: boolean;
  /** the whole permutation that shipped */
  peritropePairs: PeritropePair[];
  /** tokens won against ANTISTROPHE */
  peritropeGain: number;
  /** how many candidate pairs the beam priced */
  peritropePriced: number;
}

/**
 * Encode. Beam-search the permutation, carry it through the stack, price the
 * clause against the exact contract, and ship only when the measured full
 * message is strictly smaller than ANTISTROPHE's.
 */
export function peritropeEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: any = {},
): PeritropeResult {
  const parent = antistropheEncode(text, enc, opts);
  const plain: PeritropeResult = {
    ...parent, peritrope: false, peritropePairs: [], peritropeGain: 0, peritropePriced: 0,
  };
  if (opts.peritrope === false) return plain;
  if (!text.length || text.length > 400_000) return plain;

  const found = peritropeSearch(text, enc, opts.peritropeSearch);
  if (!found.chains.length) return { ...plain, peritropePriced: found.priced };

  // Pick the depth by measured raw delta plus measured clause cost, so only ONE
  // full stack encode is needed. (A clause-only estimate ignores that a pair
  // which saves 3 raw tokens may cost 2 to state.)
  const clauseCost = (pairs: PeritropePair[]) =>
    countTokens(' ' + peritropeClauseFor(pairs) + ' print only.', enc)
    - countTokens(' print only.', enc);

  let bestK = -1, bestScore = 0;   // strictly negative to be worth shipping
  for (let k = 0; k < found.chains.length; k++) {
    const score = found.deltas[k] + clauseCost(found.chains[k]);
    if (score < bestScore) { bestScore = score; bestK = k; }
  }
  if (bestK < 0) return { ...plain, peritropePriced: found.priced };
  const pairs = found.chains[bestK];

  let swapped: string;
  try { swapped = peritropeApply(text, pairs); } catch { return { ...plain, peritropePriced: found.priced }; }

  // ANTISTROPHE is disabled inside the trial on purpose. PERITROPE owns the
  // whole permutation, so the exchanges it ships are pairwise disjoint by
  // construction and the reader gets one clean list; letting the inner
  // ANTISTROPHE add its own pair would break that guarantee and would also cost
  // two extra stack encodes per candidate.
  let r: AntistropheResult;
  try { r = antistropheEncode(swapped, enc, { ...opts, antistrophe: false }); }
  catch { return { ...plain, peritropePriced: found.priced }; }

  const contract: string = (r as any).contract ?? '';
  const clause = peritropeClauseFor(pairs);
  const clauseTok = clauseCost(pairs);
  const total = r.messageTokens + clauseTok;
  if (total >= parent.messageTokens) return { ...plain, peritropePriced: found.priced };

  const tail = 'print only.';
  return {
    ...r,
    contract: contract.endsWith(tail)
      ? contract.slice(0, contract.length - tail.length) + clause + ' ' + tail
      : contract + ' ' + clause,
    messageTokens: total,
    peritrope: true,
    peritropePairs: pairs,
    peritropeGain: parent.messageTokens - total,
    peritropePriced: found.priced,
  };
}

/** Decode: undo the exchanges after the stack has finished. Disjoint => order-free. */
export function peritropeDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: {
    alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: any;
    ouraShape?: { sep: string; suf: number[]; minLen: number; k?: number } | null;
    ouraMode?: 'mark' | 'plain' | 'lead'; ouraSentinel?: string;
    antistrophePair?: [string, string] | null;
    peritropePairs?: PeritropePair[];
  } = {},
): string {
  const mid = antistropheDecode(wire, cfg, opts);
  const pairs = opts.peritropePairs;
  if (!pairs || !pairs.length) return mid;
  return peritropeApply(mid, pairs);
}
