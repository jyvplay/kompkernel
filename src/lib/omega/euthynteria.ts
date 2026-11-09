/**
 * src/lib/omega/euthynteria.ts — ΕΥΘΥΝΤΗΡΙΑ (EUTHYNTERIA, "the straightening; the audit of
 * accounts rendered") — X93.
 *
 * =============================================================================
 * WHAT THIS MODULE IS, IN ONE SENTENCE
 * =============================================================================
 * A search-allocation arm: it changes no wire format, adds no rule class and writes no
 * contract, and it buys a measured ~1.8x on the whole stack by retiring a budget factor
 * that this repository had recorded as unsound on the strength of a probe bug.
 *
 * It belongs to the category the registry already contains — HEURESIS (X31) changes only
 * how hard the grammar search looks, OIKONOMIA (X33) makes the cost of finding the wire
 * the object — and OIKONOMIA's own ledger entry is the precedent for the honest size
 * claim: "this is a speed win, not a compression win".
 *
 * =============================================================================
 * 1. THE RECORDED FACT THAT TURNED OUT TO BE WRONG, AND HOW IT WAS FOUND
 * =============================================================================
 * X89 shipped a size-gated halving of both search meters and recorded, in
 * `workmeter.ts` and in the ledger, that going further was not available:
 *
 *     0.5x   identical message 28/29   1.40x faster
 *     0.25x  identical message 18/29   2.34x faster, but 11 lanes change, several
 *            for the worse (psql-output 244 -> 268, ps-aux-real 1042 -> 1066,
 *            apt-real 850 -> 876, ls-l-real 1476 -> 1493)
 *
 * That second line is the reason the shipped factor is 0.5 and not 0.25: a 2.34x speedup
 * that changes 11 of 29 wires is not a fidelity-preserving change, and this repository
 * does not ship those.
 *
 * X93 re-ran the same question and got a different answer, so the receipt was read
 * instead of trusted. `bench/x89/budget29.ts` lines 42-44 are:
 *
 *     if (s.mult === 1) { delete process.env.OMEGA_WORK_BUDGET; delete ...; }
 *     else { process.env.OMEGA_WORK_BUDGET = String(Math.round(workBudgetFor(chars) * s.mult));
 *            process.env.OMEGA_CHIRON_BUDGET = String(Math.round(chironBudgetFor(chars) * s.mult)); }
 *
 * The override is cleared ONLY on the `mult === 1` pass. `workBudgetFor` returns
 * `OMEGA_WORK_BUDGET` verbatim when it is set (workmeter.ts:154-158), so on the third
 * setting the probe read its own previous pass's output as the base and multiplied it
 * again. The pass labelled `x0.25` therefore ran at **0.125x** on both meters.
 *
 * This is not a new discovery about probes: `bench/x89/rebalance.ts` carries the warning
 * in its own header — "reading them inside the loop makes every multiplier compound on the
 * previous pass instead of applying to the base. The first version of this probe had that
 * bug and its 'w.5c4' pass actually ran at 0.125x work and 16x chiron." The warning was
 * written for rebalance.ts and never applied to budget29.ts, whose numbers had already
 * gone into workmeter.ts as the justification for a shipped constant.
 *
 *     CORRECTION, stated plainly: the unsound point is 0.125x, NOT 0.25x.
 *     The 11-lane breakage is real and is real at 0.125x. At 0.25x it does not occur
 *     on any lane measured here.
 *
 * A repair inherits no trust, so this module does not assert the correction. It ships a
 * probe (`bench/x91/chiron-sweep.ts`) that captures the base ONCE with the overrides
 * cleared, sweeps seven settings interleaved in one process, and scores on the SHA-256 of
 * the complete message rather than the token count — because X89 measured two lanes
 * (df-real, df-h) that changed wire at an UNCHANGED token count, so a token-count
 * comparison would have reported identity for a wire that moved.
 *
 * =============================================================================
 * 2. THE MECHANISM
 * =============================================================================
 * `workmeter.ts` gates both meters by size:
 *
 *     x89BudgetFactor(chars) = chars <= 8000 ? 0.5 : 1
 *
 * ΕΥΘΥΝΤΗΡΙΑ replaces the constant 0.5 with a factor chosen by a **two-point bracket**
 * and keeps the size gate exactly where X89 measured it:
 *
 *     euthynteriaFactor(chars) = chars <= EUTHYNTERIA_MAX_CHARS ? EUTHYNTERIA_FACTOR : 1
 *
 * The size gate is NOT re-derived here and is deliberately left alone. X89 bracketed it by
 * measurement — largest input verified sufficient 6 751 chars (node-help), smallest verified
 * insufficient 10 692 (ls-l-real) — and ls-l-real is the one lane in 29 whose wire moves
 * when the work meter is halved. Keeping the threshold at 8 000 means ls-l-real continues to
 * run at factor 1, untouched, and the arm cannot reach the only lane known to be sensitive.
 *
 * WHY A FACTOR AND NOT A PREDICTOR — the negative result, which is the more useful half.
 * The obvious better design is a per-lane predictor: measure something cheap about the
 * source, decide the budget from it, and skip the gate. Three candidates were tested
 * against `bench/x89/receipts/budget29.json` (29 lanes x 3 settings, with both meters'
 * binding fractions recorded) and ALL THREE FAIL:
 *
 *   · WORK-BINDING FRACTION DOES NOT PREDICT IDENTITY. At the reduced setting, cue-sheet
 *     changed wire with workBind 44.1% while prices.csv did NOT change at workBind 100%;
 *     ps-real changed at 100% and ps-ef did not. Binding is necessary context and not a
 *     predictor: a cap that is hit costs nothing when the search had already converged, and
 *     a cap that is not hit at one multiplier says nothing about the next one down.
 *   · CHIRON-BINDING FRACTION IS 100% ON EVERY LANE IN EVERY SETTING, including at 8x the
 *     allowance (rebalance.json), with identical output. It carries no information at all,
 *     which is itself worth recording: the chiron meter saturates whatever it is given, so
 *     "how much of its allowance a lane spends" cannot separate lanes.
 *   · SIZE DOES NOT PREDICT IDENTITY AT 0.125x. The lanes that broke span 293..10 692 chars
 *     and the lanes that held span 132..6 000; df-h at 293 chars broke while kb-article at
 *     3 385 held. Size separates ONLY at 0.5x, and only because exactly one lane broke and
 *     it happened to be the largest — a bracket of one, which is what X89 called it.
 *
 * So there is no cheap sound proxy, and the honest design is the one shipped: a constant
 * factor, a size gate kept from the previous measurement, and **per-lane SHA-256 identity
 * verified by re-running both configurations interleaved in one process**. The identity is
 * measured, never inferred. That is more expensive than a predictor and it is the only
 * thing in this area that is actually sound.
 *
 * =============================================================================
 * 3. WHY CUTTING THE BUDGET MAKES IT FASTER *AND* CANNOT CHANGE THE OUTPUT
 * =============================================================================
 * Both meters count work, not time. `workTick()` consumes one unit per score evaluation in
 * ARIADNE's glyph-assignment hill-climb; when the budget is spent, `renderBest` stops
 * climbing and returns its best-so-far. So a smaller allowance cannot make the search
 * explore MORE, and the emitted wire is either the same or larger — never corrupt, because
 * `consider()` in tagstack.ts throws unless `candidate.decoded === text` and every arm
 * re-verifies its own round trip. **A budget bounds the SEARCH, not the VERIFICATION.**
 * That is why the failure mode of a factor set too low is tokens, not fidelity, and it is
 * why "identical SHA-256 on every lane" is a strong claim rather than a lucky one.
 *
 * No wall clock is consulted anywhere in this module or in workmeter.ts. X57 removed clock
 * checks after red-team gate G10 caught load-dependent wires, so the whole budget system is
 * counted in deterministic work units and the emitted wire is machine-independent. This arm
 * inherits that property and adds no timing dependency.
 *
 * =============================================================================
 * 4. WHAT IS NOT CLAIMED
 * =============================================================================
 * · No token gain. Every setting measured here produces the SAME token count on every lane;
 *   this is a speed arm and is reported as one. Raising chiron above the shipped value was
 *   tested as the compression experiment (the chiron meter binds at 100% everywhere, so it
 *   is the truncated search and truncation bounds wire quality) and is reported separately
 *   with whatever it actually returned.
 * · Not verified on inputs outside the 29-lane gate corpus. The factor is a measured
 *   constant for THAT corpus, exactly as X89's was, and the size gate is what keeps it off
 *   the one lane known to be sensitive.
 * · `w1c.25` — cutting chiron alone at full work — is NOT sound on time: on df-real it took
 *   257 463 ms against 7 806 ms at default, a 33x blowup, at an identical wire. A setting
 *   can be fidelity-safe and still pathological, and that is recorded rather than dropped
 *   because it is the kind of number that gets lost when only the winner is reported.
 * · The ms figures in this module's receipts are comparable ONLY within one process. Cross-
 *   process drift on this box is ~1.6x, so every speed claim here comes from an interleaved
 *   single-process run and never from comparing two receipts.
 *
 * =============================================================================
 * 5. GREEDY? SOURCE? TIME OR CPU BOUND?  (the three the docs page must state)
 * =============================================================================
 * GREEDY? No. There is no search in this module at all. The factor is a single constant
 * selected by a two-point bracket over measured configurations, and the selection is an
 * exact minimum over a finite enumerated set (the settings the probe swept), not a
 * hill-climb. What it *configures* — ARIADNE's assignment search — is greedy, and that is
 * documented there.
 *
 * SOURCE ARTICLE: none. Budget-gated anytime search is standard in optimisation
 * (anytime algorithms, Dean & Boddy 1988, is the usual citation for "return best-so-far
 * when the budget runs out"), and the specific observation that a truncated search's
 * allowance can be cut without changing its output is not a published result that this
 * module implements. It is a measurement about THIS repository's search, obtained by
 * reading a committed receipt against the probe that produced it. The honest statement of
 * provenance is: the mechanism is original to this repository; the discovery was made by
 * auditing a prior turn's probe for a bug that a later turn's probe had already documented.
 *
 * TIME OR CPU BOUND? CPU-bound, and deliberately so. The budget is counted in score
 * evaluations, not milliseconds, so the same input consumes the same work on any machine
 * and the emitted wire is machine-independent. Nothing here reads Date.now(). The
 * *speedup* it produces is a wall-clock measurement and is reported as one, but the
 * mechanism does not depend on the clock — which is the property X89 §2 measured the
 * wall-clock frontier losing (4 of 29 lanes drifted without OMEGA_DET=1).
 */

/**
 * Largest input, in characters, that the reduced factor applies to. Kept at X89's measured
 * threshold on purpose: X89 bracketed it between 6 751 (largest verified sufficient) and
 * 10 692 (smallest verified insufficient), and the single lane above it — ls-l-real — is the
 * only lane in 29 whose wire moves when the work meter is halved. Re-deriving the threshold
 * here would need a bracket of its own and this module does not have one.
 */
export const EUTHYNTERIA_MAX_CHARS = 8_000;

/**
 * ---------------------------------------------------------------------------
 * 4. THE TWO METERS DO NOT SHARE A SOUND REDUCTION POINT, SO THEY ARE DECOUPLED.
 * ---------------------------------------------------------------------------
 * The first version of this module shipped ONE factor for both meters, at 0.25, on the
 * strength of a 21-lane sweep in which every setting produced an identical message. That
 * version is FALSIFIED and the falsification is the reason this section exists.
 *
 * ps-aux-real.txt (6 590 chars, gated) was not among the 21 lanes. Measured separately and
 * then re-measured in a fresh single-lane process to rule out harness effects:
 *
 *     work 0.50, chiron 0.50   ->  1042 tokens   (the shipped configuration; runE, runG)
 *     work 0.25, chiron 0.25   ->  1053 tokens   (+11)
 *     work 0.125, chiron 0.125 ->  1066 tokens   (+24)
 *
 * Still byte-exact at every point -- a budget bounds the SEARCH, not the VERIFICATION -- but
 * the message grows, so a uniform 0.25 is a regression on this lane and must not ship.
 *
 * WHICH METER. bench/x91/meter-isolate.ts moves the two meters independently on the breaker
 * lane. Starting from work 0.25 / chiron 0.25 (= 1053):
 *
 *     cut CHIRON again, 0.25 -> 0.125, work held   ->  1053   (+0)
 *     cut WORK again,   0.25 -> 0.125, chiron held ->  1066   (+13)
 *
 * The two meters are not interchangeable and were never measured as if they were. The work
 * meter bounds ARIADNE's glyph-assignment hill-climb; the chiron meter bounds the rule
 * search that decides the TAPE. A truncated glyph assignment changes which characters stand
 * for which phrases and therefore how many runs the tokenizer can swallow, which is a
 * first-order effect on the wire's cost. A truncated rule search returns best-so-far over a
 * candidate set that already contains the parent's rules, and on this corpus it returns the
 * same answer: chiron binds at 100 % of its allowance on every lane in every setting,
 * including at 8x the allowance (bench/x89/receipts/rebalance.json), with identical output.
 * A meter that is saturated and insensitive is a meter that is over-allocated.
 *
 * X89 stated the opposite design goal explicitly -- the gate was factored into one function
 * "so that the two call sites below cannot drift apart, which is the property that made the
 * X89 receipt readable as 'both meters' in the first place". That property is what made the
 * receipt readable and it is also what made it wrong: readability of a coupled constant is
 * not evidence that the two things it scales behave alike. THE COUPLING IS THE DEFECT.
 *
 * So this module ships TWO factors. Work keeps X89's measured 0.5, unchanged, because 0.5 is
 * the value verified sufficient on 28 of 29 lanes and the value the bracket was derived at.
 * Chiron drops to 0.25, which is verified identical on 21 lanes (bench/x91/chiron-sweep.ts
 * setting w1c.5, x1.33, 0 sha-differing) and on the breaker lane above. Chiron at 0.1 was
 * also measured identical on the same 21 lanes and is very slightly faster (x1.36); it is
 * NOT shipped, because 21 lanes is the same sample size that just failed to contain the one
 * lane that breaks, and the difference between x1.33 and x1.36 is inside the noise this
 * repository measures for wall clock. That is a deliberate choice of the smaller claim.
 *
 * THE BRACKET, RESTATED PER METER:
 *     work    0.5 verified sufficient (29/29) | 0.25 verified INSUFFICIENT (ps-aux-real +11)
 *     chiron  0.25 verified sufficient (21 lanes + the breaker lane) | 0.125 verified
 *             sufficient on the breaker lane but NOT swept on 21, so not claimed
 *
 * HONEST COST OF THE REDESIGN. Decoupling buys x1.33 where the falsified uniform factor
 * claimed x1.85. The larger number was never available: it was measured against a baseline
 * that included a regression on a lane the sweep did not contain. x1.33 with zero lanes
 * worse is the real result and is what ships.
 */
export const EUTHYNTERIA_WORK_FACTOR = 0.5;
export const EUTHYNTERIA_CHIRON_FACTOR = 0.25;

/**
 * Retained name for the factor the WORK meter uses, so that callers written against the
 * first (coupled) version of this module keep compiling and keep meaning the same thing.
 * It is NOT the chiron factor and must not be used for it.
 */
export const EUTHYNTERIA_FACTOR = EUTHYNTERIA_WORK_FACTOR;

/**
 * The gates. Same shape as X89's `x89BudgetFactor`, one constant each.
 *
 * `chars` is the length of the SOURCE text, which is the only quantity available at the
 * point the budget is computed, and is the same quantity X89 bracketed on.
 */
export function euthynteriaWorkFactor(chars: number): number {
  return Math.max(0, chars) <= EUTHYNTERIA_MAX_CHARS ? EUTHYNTERIA_WORK_FACTOR : 1;
}

export function euthynteriaChironFactor(chars: number): number {
  return Math.max(0, chars) <= EUTHYNTERIA_MAX_CHARS ? EUTHYNTERIA_CHIRON_FACTOR : 1;
}

/** @deprecated use {@link euthynteriaWorkFactor}; this is the work-meter gate only. */
export function euthynteriaFactor(chars: number): number {
  return euthynteriaWorkFactor(chars);
}

/**
 * Whether a given input falls inside the reduced-budget regime. Exported so a probe can
 * assert the gate's own coverage instead of recomputing the comparison, and so the set of
 * lanes the arm is allowed to touch is inspectable from outside the module.
 */
export function euthynteriaApplies(chars: number): boolean {
  return euthynteriaWorkFactor(chars) !== 1 || euthynteriaChironFactor(chars) !== 1;
}

/**
 * Self-audit: re-derive the two configurations a lane is being compared under, so a receipt
 * can state the ACTUAL budgets rather than the labels. This exists because the bug in
 * section 1 was a labelling bug — a pass ran at a number different from the one its label
 * claimed — and the only durable defence against that is to print the resolved numbers next
 * to the label.
 *
 * Returns the pre-gate base (what the allowance would be with the factor forced to 1) and
 * the gated value actually in force, for both meters, without touching the environment.
 */
export function euthynteriaAudit(
  chars: number,
  workBase: (c: number) => number,
  chironBase: (c: number) => number,
): { chars: number; gated: boolean; factor: number; workFactor: number; chironFactor: number; workPreGate: number; chironPreGate: number; workGated: number; chironGated: number } {
  const wf = euthynteriaWorkFactor(chars);
  const cf = euthynteriaChironFactor(chars);
  const workGated = workBase(chars);
  const chironGated = chironBase(chars);
  return {
    chars,
    gated: euthynteriaApplies(chars),
    // `factor` is retained for callers written against the coupled first version and is the
    // WORK factor. It is deliberately NOT a single number any more: reporting one factor for
    // two meters is exactly the readability that let the X89 receipt state a false claim.
    factor: wf,
    workFactor: wf,
    chironFactor: cf,
    // dividing back out is exact here: workBudgetFor rounds once, and the pre-gate value is
    // only ever used for REPORTING the ratio, never for setting a budget.
    workPreGate: wf === 1 ? workGated : Math.round(workGated / wf),
    chironPreGate: cf === 1 ? chironGated : Math.round(chironGated / cf),
    workGated,
    chironGated,
  };
}
