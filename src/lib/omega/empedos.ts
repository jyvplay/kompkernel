/**
 * EMPEDOS (ἔμπεδος — "firm, steadfast, immovable, grounded in the earth").
 *
 * X47. The same document, the same code, the same machine — and a search whose
 * stopping rule is a WALL CLOCK. EMPEDOS replaces the clock with a counted budget,
 * so a wire depends on its input and not on how busy the machine was.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * CHIRON's variant sweep is bounded by elapsed time, not by work done.
 * chiron.ts:1341 sets `budgetMs = min(11_000, 800 + 1.1 * len)` and chiron.ts:1373
 * caps the whole sweep at `min(26_000, 2.1 * budgetMs)`. A sweep that runs out of
 * clock stops where it happens to be, so on any input large enough to exhaust the
 * allowance the admitted rule set — and therefore the wire, and therefore the token
 * count — is a function of machine load.
 *
 * X46 hit exactly that. TEKMAR returned 607 on dump.sql where X45's parent returned
 * 608, through what is by construction the same computation: on a lattice lane TEKMAR
 * passes inCap=4 and inGate=1, which are precisely OIKNOMIA_DEFAULT_IN_CAP and
 * OIKNOMIA_DEFAULT_IN_GATE. The one-token difference was reported as unattributed
 * rather than claimed, and the wall clock was the named suspect. It also puts a floor
 * under how finely this repository can measure anything: if a single token can move
 * between runs, then X41's meeting-transcript -1, X44's prose-01 -1 and X46's
 * dump.sql -1 are all inside the noise, and no future turn can honestly claim a
 * one-token gain without repeated runs.
 *
 * WHAT WAS MEASURED BEFORE SHIPPING THIS
 * ---------------------------------------------------------------------------
 * chiron.ts:1380 already implements the deterministic alternative, a counted
 * `workUnits` budget, so this is not a new search — it is a change of stopping rule.
 * Two things had to be established first, and both were, because a deterministic
 * budget that costs tokens or time is not an improvement.
 *
 * 1. THE CLIFF (bench/x47/det.ts, pom.xml, 1,797 chars, 544 raw tokens). A counted
 *    budget does not degrade gracefully; below the convergence point it collapses:
 *
 *        workUnits      msg   rules   note
 *              5,000    544       0   RAW FALLBACK -- the codec finds nothing at all
 *              50,000    312       8   truncated grammar, 7 tokens short
 *             500,000    305      13   converged, equals the wall-clock default
 *           5,000,000    305      13   converged, no further change
 *
 *    So 500,000 units is the measured floor for this input and 50,000 is unsafe.
 *    This is why EMPEDOS pins a constant rather than scaling the budget to the
 *    document: the failure mode of guessing low is not a slightly worse wire, it is
 *    the raw fallback, which is the worst possible outcome. The constant is stated
 *    with the cliff it was measured against so the next turn does not lower it.
 *
 * 2. EQUIVALENCE AND REPEATABILITY (bench/x47/wu.ts, pom.xml at the oikonomia level,
 *    three repetitions of each of three budgets, every wire decoded byte-exact):
 *
 *        budget               run 1              run 2              run 3
 *        wall-clock default   242 / 10,246 ms    242 / 10,101 ms    242 /  9,495 ms
 *        workUnits=500,000    242 /  9,132 ms    242 / 10,041 ms    242 /  9,932 ms
 *        workUnits=2,000,000  242 / 10,149 ms    242 / 10,767 ms    242 / 10,428 ms
 *
 *    All nine runs return 242 tokens and 2.98M countTokens calls. **The counted
 *    budget reproduces the wall-clock result exactly, and the timing distributions
 *    overlap**, 9,132-10,149 ms against 9,495-10,246 ms, so determinism is not
 *    bought with wall clock. The same screen also found CHIRON itself deterministic
 *    on this input across five runs — 305 tokens, 13 rules, hangul, every time —
 *    because at 1,797 characters the clock allowance is 2,777 ms and the sweep
 *    finishes in 66 ms. **The clock only bites on inputs large enough to exhaust
 *    it, which are exactly the inputs too expensive to re-run, which is why this was
 *    never measured before.**
 *
 * WHAT IT DOES
 * ---------------------------------------------------------------------------
 * EMPEDOS is TEKMAR plus a pinned work budget. It inherits TEKMAR's per-document
 * shape-trial ceiling, chosen from the tokenization-free row-lattice feature, and
 * adds three explicit settings so that nothing about the run depends on an unset
 * default or on elapsed time:
 *
 *   · `workUnits = 500,000`, the measured convergence floor, replacing the clock.
 *   · `inGate = 1` stated explicitly. This matters more than it looks: symploke.ts:745
 *     defaults it with `opts.inGate ?? 0` while oikonomia.ts defaults it to 1, so any
 *     path that reaches SYMPLOKE without threading the gate gets 0. X45 measured the
 *     difference on pom.xml as 5.60M countTokens calls and 19,618 ms for gate 0
 *     against 2.98M and 11,716 ms for gate 1 -- 1.88x the work for the identical
 *     242-token message. Pinning it removes the ambiguity rather than relying on
 *     every caller remembering.
 *   · `inCap` from the lattice feature, as TEKMAR.
 *
 * It changes no wire format, adds no clause and adds no marker. On a document where
 * the clock was never binding it produces the identical wire; on one where the clock
 * was binding it produces the wire the search would have reached had it been allowed
 * to finish, which is the same wire every run produces.
 *
 * Greedy: YES, and inherited. EMPEDOS performs no search of its own; the cap is
 * decided once, before the search, from one linear scan, exactly as in TEKMAR, and
 * the work budget is a constant. Nothing is revisited.
 *
 * Not optimal, and the specific way it is not: 500,000 units is a floor measured on
 * ONE input of 1,797 characters. A much larger document could converge only above
 * it, and because the cliff is a collapse rather than a slope, under-setting the
 * budget would show up as the raw fallback and not as a slightly worse wire. The
 * guard against that is empirical and is stated as a gap rather than solved: the
 * budget should be re-measured on the largest lane before it is trusted there.
 *
 * Time and CPU bound: yes -- the bound is now COUNTED rather than elapsed, which is
 * the whole point. The sweep performs at most the work 500,000 units buys, on any
 * machine, under any load. Measured cost is indistinguishable from the wall-clock
 * default on the lane tested.
 */
import { type EncodingName } from './bpe';
import { tekmarEncode, tekmarDecode, tekmarChooseCap, type TekmarResult } from './tekmar';

/**
 * Deterministic work budget, and the measured convergence floor. On pom.xml
 * (1,797 chars) 500,000 units reproduce the wall-clock default exactly -- 305
 * tokens, 13 rules at the chiron level, 242 at the oikonomia level, 2.98M
 * countTokens calls.
 */
export const EMPEDOS_WORK_UNITS = 500_000;
/**
 * The cliff below the floor, recorded so that nobody lowers the constant without
 * re-measuring. 50,000 units gives 312 tokens and 8 rules on pom.xml, 7 short of
 * converged; 5,000 gives 544 with zero rules, the raw fallback.
 */
export const EMPEDOS_TRUNCATES_AT = 50_000;
export const EMPEDOS_RAW_FALLBACK_AT = 5_000;
/** Pinned explicitly because symploke.ts:745 defaults it to 0 and oikonomia.ts to 1. */
export const EMPEDOS_IN_GATE = 1;

export interface EmpedosResult extends TekmarResult {
  empedos: boolean;
  empedosWorkUnits: number;
}

export function empedosEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: Record<string, any> = {},
): EmpedosResult {
  if (opts.empedos === false) {
    const r = tekmarEncode(text, enc, opts);
    return { ...r, empedos: false, empedosWorkUnits: opts.workUnits ?? 0 };
  }
  const r = tekmarEncode(text, enc, {
    ...opts,
    workUnits: opts.workUnits ?? EMPEDOS_WORK_UNITS,
    inGate: opts.inGate ?? EMPEDOS_IN_GATE,
  });
  return { ...r, empedos: true, empedosWorkUnits: opts.workUnits ?? EMPEDOS_WORK_UNITS };
}

/** Decode is the parent's: EMPEDOS changes a stopping rule, never a wire format. */
export function empedosDecode(wire: string, cfg: any, opts: any = {}): string {
  return tekmarDecode(wire, cfg, opts);
}

export { tekmarChooseCap, tekmarLatticeScore } from './tekmar';
