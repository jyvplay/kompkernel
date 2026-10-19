/**
 * SYNKOPE -- X29.
 *
 * What it is: SYNTOMOS (X28) with the CONTRACT ladder extended, and nothing
 * else changed. The wire is byte-identical to SYNTOMOS; only the instruction
 * text in front of it is rewritten.
 *
 * Why that is worth a codec at all.
 * ---------------------------------
 * X29 opened by trying, and failing, to beat the one-token barrier five
 * separate ways (receipts in docs/codecs.md X29 section B):
 *   B.1 inter-glyph gap rules  -- dead, gaps are essentially all unique
 *   B.2 rule injection scored against the true tokenizer -- zero candidates
 *   B.3 format-native references (Makefile `$(x)`, LaTeX `\x`) -- dead, every
 *       wrapper costs +1.00 token and a 3-glyph run goes 1.75 -> 6.00 tokens
 *   B.4 glyph-script choice -- run quality is driven by POOL SIZE, not script
 *   B.5 glyph reassignment -- 1 token, saturated
 * So the variable-cost side of the wire is exhausted, and the only remaining
 * term that still moves is the one term that is paid ONCE PER MESSAGE and
 * therefore does not shrink as the message grows: the contract.
 *
 * The contract is a fixed tax, so it is also the term that decides whether a
 * short message can be compressed AT ALL. bench/x29/micro.ts measured this
 * directly: with the contract removed, a naive extractor gets git-log-fuller
 * 143 -> 130 and meeting-transcript 472 -> 385 (which BEATS the full stack's
 * 389). With the contract restored at its X28 cost, every one of those gains
 * is eaten and the lane reverts to identity. The fixed cost is the binding
 * constraint, not the grammar.
 *
 * What is actually cut.
 * ---------------------
 * X28's contract is three sentences:
 *     "Letters before P name the phrases after them. Then After S expand
 *      [repeatedly] and 8 digits become YYYY-MM-DD. Print only the result."
 *                                                     = 19 flat / 20 nested
 * Two of the three are redundant with each other:
 *   - "Letters before P name the phrases after them. Then After S ..."
 *     spends a whole clause and a fresh sentence on locating the two regions.
 *     One verb can do it: "Expand the letters before P throughout the text
 *     after S". Same two anchors named, one clause instead of two sentences.
 *   - "Print only the result." is 5 tokens; "Print only it." is 4 and says
 *     the same thing, because the result is the only antecedent in scope.
 * Measured against o200k_base (bench/x29/ctok3.ts):
 *     flat   19 -> 15     1 shape 27 -> 23     2 shapes 37 -> 33
 *     nested 20 -> 17     1 shape 25(->) , i.e. a flat -4 on every rung.
 *
 * Greedy? No. The rung is chosen by exhaustive minimum over a finite ladder
 * (two entries), evaluated on the true message. The head/tail rewrites inside
 * a rung are fixed string substitutions, not search.
 *
 * Time/CPU bound? The rewrite is O(len(contract)) with two regex matches. The
 * underlying encode is SYNTOMOS's, which is budget-bounded by POLYTROPOS.
 * SYNKOPE adds no search of its own, so it cannot change the wire and cannot
 * change the encode time.
 *
 * Source article: none. The two-sentence-to-one-clause contraction and the
 * "Print only it." tail are plain English editing, not a published result. The
 * finding that the CONTRACT is the binding term on short messages is ours
 * (bench/x29/micro.ts); the nearest external framing is arXiv 2607.06145
 * ("Prompting Complexity", Psi_f(t) = shortest plausible prompt s.t. f
 * deterministically outputs t), which is the right yardstick for this object
 * and which provably has no model-independent invariance theorem -- so the
 * token counts below are o200k_base counts, not universal ones.
 */

import { EncodingName, countTokens } from './bpe';
import {
  SymplokeStats,
  symplokeContract,
} from './symploke';
import {
  SyntomosOptions,
  SyntomosResult,
  syntomosEncode,
  syntomosDecode,
} from './syntomos';
import { chironDecode } from './chiron';

/**
 * A rung is a surgical rewrite of exactly ONE substring of the parent
 * SYNTOMOS contract. A rung is defined by the literal string it looks for and
 * the literal string it substitutes, so that if the parent's wording ever
 * changes the rung simply does not match and is skipped.
 */
export interface SynkopeRung {
  id: string;
  /** literal substring that must be present, or the rung is skipped */
  find: string;
  /** replacement; must preserve every fact the `find` string stated */
  replace: string;
}

/**
 * The only contract term that o200k_base actually charges for.
 *
 * bench/x29/ctok4.ts measured 7 different heads against the 4 real tails the
 * SYMPLOKE contract emits: ALL of them cost the same number of tokens
 * (17/17/17, 25/25/25, 43/43/43). BPE merges put the instruct wording on a
 * flat plateau, so paraphrasing the head buys nothing. The shape clause is the
 * one place that is NOT on that plateau, because it is the only part made of
 * low-frequency material (digit templates and the sentinel rule).
 *
 * `shapes` is the safe compression of it. `shapesUnsafe` is what X28's own
 * post-mortem warns about: it drops the fact that ONLY ^-marked digit runs are
 * reformatted, so a reader that expands every 8-digit run produces the wrong
 * bytes. It is 8 tokens cheaper on dump.sql (43 -> 35) and is NOT in the
 * default ladder for that reason.
 */
export const SYNKOPE_LADDER: SynkopeRung[] = [
  {
    id: 'shapes',
    find: ' and 8 digits become ',
    replace: ', 8 digits as ',
  },
  {
    id: 'sentinel',
    find: ', where ^ before digits marks them; drop it',
    replace: ', ^ marks those digits so drop it',
  },
];

/** Not enabled by default: see the note above. Kept so the measurement is reproducible. */
export const SYNKOPE_UNSAFE_LADDER: SynkopeRung[] = [
  { id: 'dropSentinel', find: ', where ^ before digits marks them; drop it', replace: '' },
];

export interface SynkopeOptions extends Omit<SyntomosOptions, 'ladder'> {
  /** rungs to consider; defaults to SYNKOPE_LADDER */
  ladder?: SynkopeRung[];
}

export interface SynkopeResult extends SyntomosResult {
  /** which rungs fired, in order */
  rungs: string[];
  /** contract token count the parent SYNTOMOS would have shipped */
  parentContractTokens: number;
  /** tokens saved against SYNTOMOS on this message */
  delta: number;
}

/**
 * Apply every matching rung to a SYNTOMOS contract, keeping a rewrite only if
 * it strictly lowers the token count of the WHOLE message.
 *
 * Only literal substring replacement is allowed here -- never a regex over the
 * shape clause and never a re-synthesis. X28 established why: a draft that
 * rebuilt the shape clause with a regex deleted it outright on dump.sql and
 * capitalised a mid-sentence "and" on meeting-transcript, and the TypeScript
 * round trip could not see either bug because symplokeUncollapse reads its
 * shape table from `stats`. Only a decoder handed nothing but the message can
 * catch that class of bug, so the rule is: touch one literal substring at a
 * time, and re-measure after each.
 */
export function synkopeContract(contract: string, ladder: SynkopeRung[]): string {
  if (!contract) return '';
  let s = contract;
  for (const rung of ladder) if (s.includes(rung.find)) s = s.split(rung.find).join(rung.replace);
  return s;
}

/** Encode: SYNTOMOS, then apply each rung greedily, keeping only ones that strictly help. */
export function synkopeEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: SynkopeOptions = {},
): SynkopeResult {
  const ladder = opts.ladder ?? SYNKOPE_LADDER;
  const { ladder: _ignored, ...parentOpts } = opts;
  const base: SyntomosResult = syntomosEncode(text, enc, parentOpts);
  const wireTokens = countTokens(base.wire, enc);
  const parentContractTokens = base.contract ? countTokens(base.contract, enc) : 0;

  let contract = base.contract;
  let tokens = wireTokens + parentContractTokens;
  const fired: string[] = [];
  for (const rung of ladder) {
    if (!contract.includes(rung.find)) continue;
    const next = contract.split(rung.find).join(rung.replace);
    const nextTokens = wireTokens + countTokens(next, enc);
    if (nextTokens < tokens) { contract = next; tokens = nextTokens; fired.push(rung.id); }
  }
  return {
    ...base,
    contract,
    rungs: fired,
    parentContractTokens,
    delta: tokens - base.messageTokens,
    messageTokens: tokens,
  };
}

export function synkopeDecode(
  wire: string,
  cfg: { stats: SymplokeStats; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return syntomosDecode(wire, cfg);
}

export function synkopeRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
): boolean {
  const r = synkopeEncode(text, enc);
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  return synkopeDecode(r.wire, { stats: r.stats, order: r.order, undo }) === text;
}
