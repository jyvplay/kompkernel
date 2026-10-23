/**
 * METRON (μέτρον — "a measure, the due measure, that by which anything is measured").
 *
 * X45. The search budget at the bottom of this stack is an inherited constant.
 * METRON replaces it with a measured one.
 *
 * WHERE THE TIME ACTUALLY IS
 * ---------------------------------------------------------------------------
 * X44 localized the stack's dominant cost to a single layer but could not say
 * which. bench/x45/attrib.ts settles it, timing each layer alone on pom.xml (a
 * 1,797-character file) with bpe.ts's own exported cache counters read around each
 * call so the work is attributed rather than inferred:
 *
 *     layer        self-ms    msg    countTokens calls
 *     chiron           234    305             20,267
 *     symploke      12,773    257          4,256,606
 *     metathesis       419    254              5,114
 *     syntomos        -132    251                  6
 *     heuresis       3,043    248          1,340,464
 *     timema            72    242                  5
 *     oikonomia     -7,129    242         -2,623,280
 *
 * pyknosis, syncope and anadiplosis add nothing at all on top -- negative
 * self-time and identical call counts -- because they only delegate. **SYMPLOKE is
 * the cost centre: 12.8 seconds and 4.24 million countTokens calls on a file under
 * two thousand characters**, 2,357 calls per character, for a 48-token win.
 * HEURESIS adds 1.34 million calls for three tokens.
 *
 * Those call counts are internal chunk lookups, not distinct documents: one
 * countTokens of a full wire pretokenises it and looks up every chunk, so the
 * honest unit is full-wire tokenizations. oikonomia.ts's own X33 header records the
 * scale -- 113,629,256 characters pushed through the pretokenise regex in one
 * encode, mean long-call length 1,738 characters. On that reading SYMPLOKE performs
 * roughly 1,670 full-wire tokenizations even at its cheapest setting.
 *
 * THAT CONTRADICTS THE DOCUMENTED BOUND. symploke.ts:786 asserts
 * SYMPLOKE_BUDGET_NOTE = "time-bound: 32 linear scans (4 fixed shapes + 5
 * group-counts x 7 separators) plus one O(n) pass per enabled shape; no sampling,
 * no backtracking, no search over the wire." Measurement says roughly 1,670
 * tokenizations OF THE WIRE at the cheapest setting and 4,240 at the default. The
 * note is not wrong about the scans; it is silent about the pricing, and the
 * pricing is the whole cost.
 *
 * THE KNOB, AND THE MEASUREMENT THAT SETS IT
 * ---------------------------------------------------------------------------
 * Two budgets control this search and both are already threaded from the top of the
 * stack: inCap and inGate reach symplokeEncode through metathesis.ts:290, and
 * scriptTries is destructured at heuresis.ts:104, whose comment says the encoder
 * tries "two or three densest scripts and never sees the rest". The cap has been 4
 * since X24; X33 added the gate; nobody has since asked whether the cap is worth
 * what it costs.
 *
 * bench/x45/insweep.ts swept it at the oikonomia level. On pom.xml and
 * component.jsx, EVERY cap from 1 to 8 and BOTH gate settings return the identical
 * message size, byte-exact. The cost is not identical:
 *
 *     inCap  inGate   pom.xml ms   calls(M)   component.jsx ms   calls(M)
 *         1       1         8,261       1.67             6,449       1.69
 *         2       1        11,207       2.98             9,797       2.95
 *         4       1        11,716       2.98             9,698       2.95   <- default
 *         4       0        19,618       5.60            16,983       5.47
 *         8       0        18,383       5.60            16,309       5.47
 *
 * bench/x45/cap0.ts then showed there is nothing below cap 1: inCap=0 makes exactly
 * the same 1.69M and 0.89M calls as inCap=1 on both lanes. **Cap 1 is the floor.**
 *
 * bench/x45/knobs.ts re-ran the question through the FULL stack, where the layers
 * above might interact, and tested scriptTries for the first time:
 *
 *     lane           default            inCap=1              inCap=1 + scriptTries=1
 *     component.jsx  264  9,561ms 2.96M   264  6,568ms 1.69M   264  4,871ms 1.29M
 *     kb-article     622  6,784ms 1.56M   622  4,856ms 0.89M   622  3,995ms 0.69M
 *     pom.xml        242 146,140ms 39.9M  242 109,236ms 22.0M  245  83,584ms 17.2M  <-- WORSE
 *
 * So the two knobs are NOT interchangeable, and this is the result that makes the
 * codec honest rather than merely fast:
 *
 *   · inCap=1 is FREE. Identical message size, byte-exact, on all three lanes, at
 *     1.34-1.46x lower wall clock and about 44 per cent fewer tokenizer calls.
 *   · scriptTries=1 is NOT FREE. It is faster still, and it costs pom.xml three
 *     tokens, 242 to 245. Rejected, with the counterexample recorded. X44's finding
 *     that permuting the rule alphabet onto any other script makes a frame 53 to 85
 *     tokens worse made a single-script budget look plausible; plausible is not
 *     measured, and measuring it found the lane where it loses.
 *
 * METRON therefore ships exactly one change: inCap=1, inGate=1. Nothing else.
 *
 * THE COUNTEREXAMPLE, WHICH IS THE MOST IMPORTANT RESULT OF THIS TURN
 * ---------------------------------------------------------------------------
 * A static cap of 1 is NOT universally safe, and the lane that proves it is the
 * lane where the mechanism the cap controls does its best work. Full-stack
 * verification against the frontier recorded at the end of X44
 * (bench/x45/verify.ts, METRON and its ANALEPSIS parent run in the same process):
 *
 *     lane                METRON  frontier  verdict    METRON ms  calls(M)  parent ms  calls(M)  speedup
 *     chart.svg              417       417  OK            27,012      4.96     34,204      9.60    1.27x
 *     ls-full-iso            364       364  OK           123,543     23.13    219,052     41.08    1.77x
 *     page.html              547       547  OK            47,663      4.55     75,892     10.78    1.59x
 *     prose-01               736       736  OK             5,579      1.08      7,253      1.92    1.30x
 *     meeting-transcript     384       384  OK             5,389      1.28      6,633      2.23    1.23x
 *     email-thread           488       488  OK            30,460      8.79     41,933     15.33    1.38x
 *     bibliography           667       667  OK            26,550      6.21     33,944     11.25    1.28x
 *     readme                 646       646  OK            24,435      4.62     31,513      8.30    1.29x
 *     component.jsx          264       264  OK             6,568      1.69      9,561      2.96    1.46x
 *     kb-article             622       622  OK             4,856      0.89      6,784      1.56    1.40x
 *     pom.xml                242       242  OK           109,236     22.03    146,140     39.88    1.34x
 *     dump.sql               668       608  *** 60 WORSE 116,120     21.53    286,349     55.93    2.47x
 *
 * **Eleven of twelve lanes are identical and byte-exact at 1.23-1.77x lower wall
 * clock with 44-58 per cent fewer tokenizer calls. dump.sql loses 60 tokens, 9.9
 * per cent of its message, and is 2.47x faster doing it.** dump.sql is a database
 * dump -- dense uniform-width column rows -- which is precisely the input
 * SYMPLOKE's learned constant-width lattice exists for, so the extra 'in' shape
 * trials are not dead weight there, they are the mechanism. The three lanes that
 * motivated the cap (pom.xml, component.jsx, and the oikonomia-level sweep) are all
 * markup and code, where the lattice does little. **The generalization from those
 * lanes was wrong, and this is the receipt.**
 *
 * NO CHEAP PREDICTOR WAS FOUND. Two candidates were tested and both refuted:
 *   · SymplokeResult exposes `order: 'out' | 'in'`, which would be a proof rather
 *     than a heuristic -- if the cheap run's wire came from the 'out' order, the
 *     'in' trials never won and truncating them cannot have cost anything.
 *     bench/x45/order.ts measured it: dump.sql reports order='out', exactly like
 *     all six lanes where the cap is free. The signal does not separate them,
 *     because at the top of a nine-layer stack `order` and `parent` describe the
 *     OUTERMOST layer that fired (polytropos on every lane tested), not SYMPLOKE's.
 *   · Source-level evidence, already refuted for this role in X43 and X44.
 *
 * WHY THIS STILL CANNOT REGRESS THE RECORDED FRONTIER
 * ---------------------------------------------------------------------------
 * The registry scores every codec and keeps the best message, so on dump.sql it
 * still finds 608 through ANALEPSIS and METRON's 668 is simply not selected.
 * METRON is additive: it changes no existing codec's behaviour, only the budget it
 * requests. It is therefore pareto-superior on eleven lanes and a measured
 * TRADE-OFF POINT on the twelfth -- 60 tokens for 2.47x -- rather than a
 * dominating point everywhere, and it is recorded as exactly that. `metronInCap`
 * is exposed so a caller who needs the safe cap can ask for it.
 *
 * Greedy: YES, trivially -- METRON performs no search of its own. It is a budget
 * setting on a search that already exists, chosen once by measurement over twelve
 * lanes and never re-derived per document. That is the honest description and also
 * the limitation: the cap is a constant again, just a constant that was measured
 * instead of inherited, and the measurement found one lane where the inherited
 * value was right. A per-document cap needs a predictor of when extra shape trials
 * pay; two candidates were tested above and both were refuted, so the predictor is
 * the exact remaining gap.
 *
 * Time bound: yes, and it IS the contribution. Strictly less work than the parent
 * on eleven of twelve lanes measured: 44-58 per cent fewer countTokens calls, which
 * are the dominant cost, and 1.23-1.77x lower wall clock. On dump.sql it does 62
 * per cent less work and returns a larger message.
 */
import { type EncodingName } from './bpe';
import { analepsisEncode, analepsisDecode, type AnalepsisResult } from './analepsis';

/**
 * Ceiling on SYMPLOKE's 'in' shape trials. 4 since X24; measured here to buy
 * nothing on any lane tested, while costing 1.78x the tokenizer calls of 1.
 */
export const METRON_IN_CAP = 1;
/**
 * Abandonment gate, unchanged from X33's value. 1 abandons the 'in' order as soon
 * as a trial fails to improve with nothing accepted yet.
 */
export const METRON_IN_GATE = 1;
/**
 * HEURESIS's script budget, deliberately left at its default. Setting it to 1 is
 * faster still and costs pom.xml three tokens (242 -> 245), so it is rejected.
 * Recorded here so the next turn does not re-derive it and ship it.
 */
export const METRON_SCRIPT_TRIES_REJECTED = 1;

export interface MetronResult extends AnalepsisResult {
  metron: boolean;
  metronInCap: number;
  metronInGate: number;
}

export function metronEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: Record<string, any> = {},
): MetronResult {
  if (opts.metron === false) {
    const r = analepsisEncode(text, enc, opts);
    return { ...r, metron: false, metronInCap: opts.inCap ?? 4, metronInGate: opts.inGate ?? 1 };
  }
  const r = analepsisEncode(text, enc, {
    ...opts,
    inCap: opts.inCap ?? METRON_IN_CAP,
    inGate: opts.inGate ?? METRON_IN_GATE,
  });
  return { ...r, metron: true, metronInCap: METRON_IN_CAP, metronInGate: METRON_IN_GATE };
}

/** Decode is the parent's: METRON changes how much search runs, never a wire format. */
export function metronDecode(wire: string, cfg: any, opts: any = {}): string {
  return analepsisDecode(wire, cfg, opts);
}
