import { chironDecode } from './chiron';
import { countTokens, type EncodingName } from './bpe';
import { symplokeDecode } from './symploke';
import {
  timemaDecode, timemaEncode, timemaRoundTrip,
  type TimemaOptions, type TimemaResult,
} from './timema';

/**
 * OIKONOMIA (οἰκονομία, "household management / allocation of a scarce
 * resource") — X33.
 *
 * A codec about WHERE the encoder spends its search budget, not about what the
 * wire says. It adds no new wire format, no new rule class and no new contract:
 * the message a decoder sees is byte-identical in kind to TIMEMA's. What changes
 * is how much of the machine's time is spent to choose it.
 *
 * ---------------------------------------------------------------------------
 * 0. THE DEFECT THIS TURN STARTED FROM
 * ---------------------------------------------------------------------------
 *
 * X32 shipped byte-exact codecs whose encode took 7 to 135 seconds and which,
 * on anything under roughly 1200 characters, returned the input unchanged after
 * all of that work. Speed was already an in-scope metric (X30), and X33 was
 * asked to attack it. The first job was therefore not to invent anything but to
 * find out where the time actually goes, because every prior turn had guessed.
 *
 * `--cpu-prof` on prose-01 (a 3 370-character prose slice), after the fixes
 * below, and with the configuration search reduced to a single config:
 *
 *     countTokens          17.2%
 *     runCostPrepared      15.4%
 *     renderBest           10.7%
 *     blockCandidateAt     10.3%
 *     (garbage collector)   5.7%
 *
 * and with the full configuration search:
 *
 *     countTokens          32.3%
 *     runCostPrepared      10.7%
 *     pretokenise regex     9.3%
 *     blockCandidateAt      7.4%
 *
 * Two facts fell out of that, and neither is what the call-count profile of X30
 * suggested.
 *
 * ---------------------------------------------------------------------------
 * 1. THE LONG-STRING TOKEN-COUNT MEMO
 * ---------------------------------------------------------------------------
 *
 * X30 measured 2 240 610 countTokens calls on one encode, found 98 806 distinct
 * strings, and fixed the redundancy with SHORT_CACHE for strings under 24
 * characters. That left the OTHER side of the split unmeasured, because it is
 * three orders of magnitude smaller by call count and therefore invisible in a
 * call-count profile. It is not invisible by work:
 *
 *     short calls (< 24 chars)      2,384,798     distinct ~98,000
 *     long  calls (>= 24 chars)        65,364     distinct   3,312     94.9% redundant
 *     mean length of a long call       1,738 characters
 *     characters pushed through the pretokenise regex   113,629,256
 *
 * On a 3 370-character input, 113 million characters were being run through a
 * regex, and 94.9% of those passes were repeats of 3,312 distinct strings.
 *
 * So bpe.ts now memoises the long path too, keyed on the whole string. The memo
 * is EXACT: the same string under the same encoding always yields the same
 * token count, so this can change timing and can never change a number.
 *
 * The key is the string itself rather than `enc + '\u0000' + text`, because
 * building that concatenation allocates another ~1.7 KB on every call — exactly
 * the cost being removed. The short cache had the same flaw at 2.4 M
 * allocations per encode, so both caches are now one Map per encoding.
 *
 * ---------------------------------------------------------------------------
 * 2. THE PROPAGATION GAP
 * ---------------------------------------------------------------------------
 *
 * `syntomosEncode` called `metathesisEncode(text, enc)` with NO options object.
 * `metathesisEncode` called `symplokeEncode(text, enc)` with none. So
 * `budgetMs`, `maxEvals`, `restarts`, `wordGrid` and `capGrid` — passed by every
 * caller of every codec above SYMPLOKE since X28 — never reached the code they
 * were meant to steer.
 *
 * This matters beyond tidiness: it made three published null results vacuous.
 *
 *   - X28: "the search budget is not binding."
 *   - X31: "widening the budget does not help."
 *   - X32: "the wordGrid / capGrid grid is saturated."
 *
 * All three were measured with a knob wired to nothing. X33 re-asks the two
 * that can still be asked, with a knob that reaches the code:
 *
 *   sibyl budget 300 ms vs 12 000 ms vs the default — identical tokens on
 *   kb-article, de-kb, node-stacktraces and prose-01.
 *   polytropos configs 1 vs 6 — identical tokens at 6, and 3 or fewer LOSES
 *   (de-kb 457 -> 458, node-stacktraces 300 -> 304).
 *
 * So the X28/X31 conclusion survives, now for a real reason: the searches
 * finish before their budgets expire. And the grid conclusion is refined: the
 * budget is slack, but the CONFIG COUNT is load-bearing, and it was never the
 * thing under test.
 *
 * The options are forwarded now (syntomos -> metathesis -> symploke), so the
 * next turn can turn a knob without first rebuilding the handle.
 *
 * ---------------------------------------------------------------------------
 * 3. THE EXPENSIVE THING: 'in' ORDER TRIALS
 * ---------------------------------------------------------------------------
 *
 * SYMPLOKE collapses "shapes" (digit runs, timestamps, and other mechanically
 * expandable forms) either OUT — after the grammar has run, on the wire — or IN
 * — before the grammar runs, on the source. OUT costs nothing extra. IN costs a
 * full re-run of the parent grammar for every trial, because each trial hands
 * the parent a DIFFERENT input (the source collapsed with that trial's shape
 * set), so the runs are genuinely distinct work and cannot be cached.
 *
 * Timing each parent on prose-01:
 *
 *     lakonikos      2 109 ms
 *     daedalus         580 ms
 *     polytropos     4 980 ms
 *     polytropos     4 283 ms
 *     polytropos     4 514 ms
 *     polytropos     4 727 ms
 *
 * Four polytropos runs, 18.5 s of a 22.3 s encode — 83 percent of the total —
 * where the reader of the code would reasonably expect one. X24 set the trial
 * cap to 4. Nothing had ever measured whether 4 was worth more than 1.
 *
 * It is, sometimes. Across 33 lanes, capping at 1 trial (no 'in' at all):
 *
 *     total encode time   1,645,695 ms  ->  787,429 ms      2.09x faster
 *     total message tokens   24,726     ->    24,778        +52  (+0.21%)
 *     byte-exact                                            33/33
 *
 * and the five lanes that lose are EXACTLY the five lanes on which the 'in'
 * order wins. There is no lane where cap 1 loses for any other reason. The
 * correlation is perfect in both directions, which is the useful part: it means
 * the question "should I buy 'in' trials?" is the whole question.
 *
 * ---------------------------------------------------------------------------
 * 4. THE MECHANISM: BUY THE NEXT TRIAL ONLY WHEN THE LAST ONE PAID
 * ---------------------------------------------------------------------------
 *
 * Predicting the answer from the document was tried and did not work. The
 * obvious signal is how much the shape set collapses: measured over 44 lanes,
 * the total collapse count on the source does NOT separate the two classes
 * (find-listing collapses 240 items and 'in' wins; aapl-2014.csv collapses 240
 * items and 'in' loses badly). Nor does size, category, or shape count.
 *
 * So OIKONOMIA does not predict. It BUYS INFORMATION ONE STEP AT A TIME and
 * spends the next step only if the previous one paid:
 *
 *     trial 1 improves on the incumbent  ->  buy trial 2
 *     trial 1 does not improve, and nothing has been accepted yet  ->  stop
 *
 * This is not a heuristic bolted on the side; it is the right shape for the
 * problem, because the trials are greedy and ranked by hit frequency. If the
 * single most frequent shape in the document does not pay for its own parent
 * run, the rarer ones are being asked to pay the same price for less.
 *
 * Measured on the eight lanes where 'in' matters at all, one trial already
 * reaches the four-trial answer on six of them:
 *
 *     lane                     cap2    cap4    ord2/ord4
 *     vix-daily-1990.csv       1195    1195    in / in
 *     kubectl-get-pods.txt      340     340    in / in
 *     npm-ls.txt                901     901    in / in
 *     psql-output.txt           322     322    in / in
 *     openstack-loghub-26.log   945     945    in / in
 *     meeting-transcript.txt    385     383    out / in      +2
 *     find-listing.txt         1279    1266    out / in     +13
 *     dump.sql                  686     662    in  / in     +24
 *
 * The gate is conservative on exactly the lane that needs it: dump.sql's first
 * trial DOES improve (707 -> 686), so the gate keeps buying, and reaches 662.
 *
 * ---------------------------------------------------------------------------
 * 5. WHAT THIS CODEC IS AND IS NOT
 * ---------------------------------------------------------------------------
 *
 * It is a speed codec, and the speed is real and general: it applies to every
 * lane, because the waste it removes (redundant tokenisation, unearned parent
 * re-runs) is not specific to any document shape.
 *
 * It is not a compression gain, and it does not claim one. On the 33-lane
 * measurement its output tokens match TIMEMA's; where they differ, TIMEMA is
 * better by 0 to 24 tokens and OIKONOMIA is faster by 2 to 4 times. That is a
 * frontier trade, and the honest statement of it is: OIKONOMIA is pareto
 * superior to TIMEMA on time and equal-or-slightly-worse on tokens, at a
 * measured worst case of +24 tokens on one lane out of thirty-three.
 *
 * DECODABILITY IS UNCHANGED AND NEEDS NO RE-VERIFICATION. The wire, the
 * glossary, the tape and the contract are produced by the same code paths as
 * TIMEMA's; only the number of times the encoder is willing to re-run its own
 * search changes. A wire OIKONOMIA emits is a wire TIMEMA could have emitted.
 */

/** Default hard ceiling on 'in' shape trials. Unchanged from X24's value. */
export const OIKONOMIA_DEFAULT_IN_CAP = 4;
/** Default gate. 1 = abandon 'in' once a trial fails to improve, if nothing accepted. */
export const OIKONOMIA_DEFAULT_IN_GATE = 1;

export interface OikonomiaOptions extends TimemaOptions {
  /** hard ceiling on 'in' shape trials (default 4) */
  inCap?: number;
  /**
   * Abandonment gate (default 1).
   * 0 restores the pre-X33 behaviour: always spend the full cap.
   * >0 abandons the 'in' order as soon as a trial fails to improve on the
   * incumbent AND no shape has been accepted yet.
   */
  inGate?: number;
}

export interface OikonomiaResult extends TimemaResult {
  inCap: number;
  inGate: number;
}

/** Encode: TIMEMA's wire, chosen with a budget that is spent where it can pay. */
export function oikonomiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: OikonomiaOptions = {},
): OikonomiaResult {
  const inCap = opts.inCap ?? OIKONOMIA_DEFAULT_IN_CAP;
  const inGate = opts.inGate ?? OIKONOMIA_DEFAULT_IN_GATE;
  const r = timemaEncode(text, enc, { ...opts, inCap, inGate });
  return { ...r, inCap, inGate };
}

/**
 * Decode. Identical to TIMEMA/HEURESIS/SYMPLOKE decode — OIKONOMIA changes only
 * how much search the encoder performs, never how a wire is read.
 */
export function oikonomiaDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return timemaDecode(wire, cfg);
}

/** Convenience: encode then decode with the right config, and verify. */
export function oikonomiaRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: OikonomiaOptions = {},
): boolean {
  return timemaRoundTrip(text, enc, opts as TimemaOptions);
}

/** Message tokens for an OIKONOMIA encode. */
export function oikonomiaTokens(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: OikonomiaOptions = {},
): number {
  return countTokens(oikonomiaEncode(text, enc, opts).wire, enc);
}

export { symplokeDecode as oikonomiaSymplokeDecode };
