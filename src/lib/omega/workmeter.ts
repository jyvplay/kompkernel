/**
 * src/lib/omega/workmeter.ts
 * =============================================================================
 * Deterministic search-work budget for the ARIADNE glyph-assignment search
 * (X57 speed repair).
 *
 * WHY. Profiling (bench/x57/prof/) showed the pathological stack latency is
 * not any single codec's planner but the glyph-assignment hill-climb in
 * ariadne.ts (`renderBest` + `scoreRunCostDelta`), re-entered by every layer
 * of the wrapper chain: archetyponEncode on a 600-char hex dump made 3,132
 * renderBest calls, 7.06M score evaluations and 28.2M tokenizer calls
 * (83 s); tagstackEncode on the 1,203-char frontier lane metrics.tsv made
 * 4,003 renderBest calls and 17.9M score evaluations (309 s). Wall-clock
 * budgets are NOT an option here: this codebase removed a clock check from
 * the probes loop after red-team gate G10 caught load-dependent wires.
 * A *work* budget (counted score evaluations) is deterministic: the same
 * input always consumes the same evaluations, so emitted wires stay
 * machine-independent.
 *
 * SEMANTICS. `workEpoch(budget, fn)` opens a budget window; nested epochs
 * share the outermost window (a tagstack frontier measurement is one
 * window even though synkrisis calls archetypon inside it). When the
 * budget is exhausted, renderBest stops hill-climbing and returns its
 * best-so-far (worst case the baseline pool-order assignment): outputs
 * can only stay equal or grow on lanes where the cap binds, never corrupt
 * (every codec still byte-verifies its own decode before emitting). The
 * default budget is calibrated by measurement so that the recorded
 * frontier lanes are unaffected (see bench/x57/ receipts); lanes where
 * the cap binds are exactly the pathological tail that previously took
 * minutes-to-hours. `OMEGA_WORK_BUDGET` (integer) overrides for audits;
 * `OMEGA_WORK_BUDGET=0` means unbounded (pre-X57 behavior, for A/B).
 *
 * This module has one import, added at X93: `euthynteria.ts`, which itself imports nothing,
 * so the acyclicity this header claimed still holds. It has no other state.
 */

import { euthynteriaWorkFactor, euthynteriaChironFactor } from './euthynteria';

let budget = Number.POSITIVE_INFINITY;
let used = 0;
let depth = 0;
let lastEpochUsed = 0;

/** Consume one unit of search work. Returns false when the budget is spent. */
export function workTick(): boolean {
  used++;
  return used <= budget;
}

/** Peek without consuming. */
export function workExhausted(): boolean {
  return used >= budget;
}

export function workUsed(): number {
  return used;
}

export function workLastEpochUsed(): number {
  return lastEpochUsed;
}

/**
 * X67: read-only snapshot of the whole deterministic meter state.
 *
 * WHY. `workEpoch` restores the *outermost* window's counters on exit, so a
 * nested call outside any epoch and a call at the start of a fresh epoch are
 * the only two states that are reproducible from the arguments alone. This
 * snapshot exists so `oura.ts` can memoise a pure encode ONLY when the meter
 * state at entry is bit-identical to the state the memoised entry was computed
 * under (`depth === 1`, `used === 0`, `chironUsed === 0`, same budgets). Under
 * any other state the memo is bypassed and the ordinary computation runs, so
 * the cache can never change a wire: a hit returns exactly the object the
 * computation would have returned from the same starting counters.
 *
 * This module still has no imports and no other state.
 */
export interface WorkState {
  depth: number;
  budget: number;
  used: number;
  chironBudget: number;
  chironUsed: number;
}

/** X67: replay a memoised computation's exact unit cost (see ouraMemo). */
export function workConsume(units: number): void {
  if (Number.isFinite(units) && units > 0) used += units;
}

/** X67: replay a memoised computation's exact CHIRON unit cost. */
export function chironConsume(units: number): void {
  if (Number.isFinite(units) && units > 0) chironUsed += units;
}

export function workState(): WorkState {
  return { depth, budget, used, chironBudget, chironUsed };
}

/**
 * Default per-window budget in score evaluations, calibrated in X57 by
 * sweeping OMEGA_WORK_BUDGET per parent/arm on the pathological and the
 * frontier lanes (bench/x57/receipts/budget-sweep*): metrics.tsv through
 * TAGSTACK stays at the 210 frontier down to 100k per parent; od-bin512
 * slices through ARCHETYPON keep their unbounded token count from 200k;
 * lic-mit is invariant. 2,000,000 is 10-20x above those knees; the per-char
 * term keeps very large inputs from being starved relative to their size.
 */
export const WORK_BUDGET_BASE = 2_000_000;
export const WORK_BUDGET_PER_CHAR = 100;

/**
 * X89 — SIZE-GATED RECALIBRATION OF BOTH METERS.
 *
 * X58 found the shape of this on one lane (DAEDALUS on ewf-standings spends 113M units,
 * yet a 5M cap yields the byte-identical wire in 18.2s against 39.6s) and then set both
 * defaults with "generous headroom over those knees". X89 measures the whole knee instead
 * of one point on it: bench/x89/budget29.ts encodes all 29 frontier lanes at 1x, 0.5x and
 * 0.25x of both allowances, INTERLEAVED in one process so the ratio is not cross-process
 * drift (~1.6x on this box, which is what made runs C/D/E look like speedups), under
 * OMEGA_DET=1 so the wall clock is not the thing that differs, with OMEGA_ENGRAM=0 so the
 * reduced pass cannot replay the default pass's cached result, and compares the COMPLETE
 * MESSAGE BY SHA-256 rather than by token count, because two different wires can share a
 * token count (df-real and df-h both did: same 126/108, different message).
 *
 *   0.5x   identical message 28/29   1.40x faster overall (1.10-2.68x per lane)
 *   0.25x  identical message 18/29   2.34x faster overall, but 11 lanes change, several
 *          for the worse (psql-output 244 -> 268, ps-aux-real 1042 -> 1066,
 *          apt-real 850 -> 876, ls-l-real 1476 -> 1493)
 *
 * The single lane that 0.5x breaks is the LARGEST one, ls-l-real at 10 692 chars
 * (1476 -> 1499, +23), while every input up to 6 751 chars was byte-identical. So the
 * deficiency is a function of size, and the gate below is bracketed by measurement rather
 * than chosen freely: the threshold sits between the largest input verified sufficient
 * (6 751) and the smallest verified insufficient (10 692). Halving the allowance only for
 * inputs at or under the threshold reproduces the measured per-lane times exactly -- the
 * gate selects, per lane, between two configurations that were both measured -- for an
 * aggregate 661 105 ms -> 488 154 ms, 1.35x, with the message identical on 29/29.
 *
 * WHY THIS CANNOT BREAK CORRECTNESS. Byte-exact decode held at 29/29 at EVERY setting
 * including 0.25x. A budget bounds the SEARCH, not the VERIFICATION: tagstack's
 * `consider()` throws unless `candidate.decoded === text`, and every arm re-checks its own
 * round trip, so a truncated search can only ever produce a larger message or a refusal.
 * The failure mode of a threshold set too low is tokens, not fidelity.
 *
 * The explicit OMEGA_WORK_BUDGET / OMEGA_CHIRON_BUDGET overrides are applied BEFORE the
 * gate and are not scaled, so a sweep still sweeps the number it asks for.
 *
 * ---------------------------------------------------------------------------
 * X93 — ΕΥΘΥΝΤΗΡΙΑ: THE FACTOR ABOVE IS WRONG, AND THE RECEIPT THAT SET IT HAD A BUG.
 * ---------------------------------------------------------------------------
 * The 0.5 shipped here was chosen because `bench/x89/receipts/budget29.json` reported that
 * 0.25x changes 11 of 29 wires. That receipt was produced by a probe which clears the
 * OMEGA_*_BUDGET overrides only on its `mult === 1` pass (budget29.ts:42-44), so its third
 * setting read the SECOND setting's override as the base and multiplied it again: the pass
 * labelled x0.25 actually ran at **x0.125** on both meters. The identical bug is documented
 * in the header of bench/x89/rebalance.ts -- "reading them inside the loop makes every
 * multiplier compound on the previous pass instead of applying to the base" -- and was fixed
 * there but never re-checked here, because the number had already been promoted into a
 * shipped constant.
 *
 * Re-measured with the base captured ONCE and the overrides cleared (bench/x91/chiron-sweep
 * .ts, 21 lanes x 7 settings, interleaved in one process, OMEGA_DET=1, OMEGA_ENGRAM=0,
 * scored on the SHA-256 of the complete message because X89 measured two lanes that changed
 * wire at an UNCHANGED token count):
 *
 *     setting   tokens   ms        speedup   sha-differing   inexact
 *     default     5464   216 207      --          --           --
 *     w.5c.5      5464   116 964    x1.85          0            0     <- shipped here
 *     w.5c1       5464   118 827    x1.82          0            0
 *     w1c.1       5464   159 376    x1.36          0            0
 *     w1c.5       5464   162 676    x1.33          0            0
 *     w.5c4       5464   135 565    x1.59          1 [ps-ef]    0     <- X90's lead, FALSIFIED
 *     w1c.25      5464   414 071    x0.52          0            0     <- pathological on time
 *
 * `w.5c.5` against this module's shipped default IS a factor of 0.25 against the pre-gate
 * base, and it is byte-identical on all 21 lanes. So 0.25 is sound and 0.125 is not; the
 * bracket is 0.25 verified sufficient / 0.125 verified insufficient, and the values between
 * them are UNTESTED and not claimed.
 *
 * `w.5c4` -- the setting X90 recorded as the highest-information next test, on the strength
 * of 7 lanes at 1.71x with identical messages -- CHANGES ps-ef.txt's wire while leaving its
 * token count at 315. A token-count comparison reports identity for a wire that moved. That
 * is the second time this corpus has produced that exact divergence and the reason the score
 * here is a hash.
 *
 * The size gate is deliberately NOT re-derived: X89 bracketed it at 6 751 (largest verified
 * sufficient) to 10 692 (smallest verified insufficient) and ls-l-real, the lane above it, is
 * still the only lane in 29 whose wire moves when the work meter is halved. Keeping the
 * threshold at 8 000 means this arm cannot reach it.
 */
export const X89_HALF_BUDGET_MAX_CHARS = 8_000;
export const X89_BUDGET_FACTOR = 0.5;

/**
 * The gate, now delegated to ΕΥΘΥΝΤΗΡΙΑ (X93). Kept as a named function rather than inlined
 * so that the two call sites below -- work and chiron -- cannot drift apart, which is the
 * property that made the X89 receipt readable as "both meters" in the first place.
 */
function x89BudgetFactor(chars: number): number {
  return euthynteriaWorkFactor(chars);
}

/**
 * X93: the chiron meter gets its OWN gate. This is the whole content of the decoupling and
 * the reason the two functions below no longer call the same helper. Measured on the one
 * lane a uniform factor breaks (ps-aux-real, +11 tokens at 0.25/0.25): cutting chiron again
 * from 0.25 to 0.125 with work held costs +0, while cutting work again from 0.25 to 0.125
 * with chiron held costs +13. Chiron binds at 100% of its allowance on every lane in every
 * setting measured, including at 8x the allowance, with identical output -- a saturated and
 * insensitive meter is an over-allocated one. See euthynteria.ts section 4.
 */
function x93ChironFactor(chars: number): number {
  return euthynteriaChironFactor(chars);
}

export function workBudgetFor(chars: number): number {
  const env = typeof process !== 'undefined' ? process.env?.OMEGA_WORK_BUDGET : undefined;
  if (env !== undefined && env !== '') {
    const n = Number(env);
    if (Number.isFinite(n)) return n <= 0 ? Number.POSITIVE_INFINITY : n;
  }
  return Math.round((WORK_BUDGET_BASE + WORK_BUDGET_PER_CHAR * Math.max(0, chars)) * x89BudgetFactor(chars));
}

/**
 * Run `fn` inside a budget window. Outermost call wins; nested calls just
 * run `fn` inside the existing window. Restores prior state afterwards.
 */
export function workEpoch<T>(b: number, fn: () => T, chars = 0): T {
  if (depth > 0) return fn();
  depth++;
  const prevBudget = budget;
  const prevUsed = used;
  const prevChironBudget = chironBudget;
  const prevChironUsed = chironUsed;
  budget = b;
  used = 0;
  chironBudget = chironBudgetFor(chars);
  chironUsed = 0;
  try {
    return fn();
  } finally {
    lastEpochUsed = used;
    chironLastEpochUsed = chironUsed;
    budget = prevBudget;
    used = prevUsed;
    chironBudget = prevChironBudget;
    chironUsed = prevChironUsed;
    depth--;
  }
}

/**
 * X58: CHIRON block-template search lane. Profiling the india APO wall
 * (bench/x58/prof/) showed the second unseen cost: chiron.ts charges its
 * own per-call meter (fresh on every call), so the wrapper chain re-buys
 * a 64M-unit allowance endlessly — apographe on a 12-row india slice
 * spent 7.37 BILLION chiron units (220 s), synkrisis on license.txt
 * 1.45B (32 s), while healthy DAEDALUS prose lanes spend 11–32M. This
 * lane gives CHIRON the same treatment as ARIADNE: epoch-scoped counted
 * units, `OMEGA_CHIRON_BUDGET` override (<=0 = unbounded). Default is
 * calibrated by the X58 sweep (bench/x58/receipts/chiron-sweep*).
 */
let chironBudget = Number.POSITIVE_INFINITY;
let chironUsed = 0;
let chironLastEpochUsed = 0;

export function chironTick(units: number): boolean {
  chironUsed += units;
  return chironUsed <= chironBudget;
}

export function chironExhausted(): boolean {
  return chironUsed >= chironBudget;
}

export function chironUsedUnits(): number {
  return chironUsed;
}

export function chironLastEpochUsedUnits(): number {
  return chironLastEpochUsed;
}

// X59 recalibration (bench/x59/receipts/chiron-recal*): measured epoch
// spends show the X58 default (400M + 20k/char) is 10-100x above the point
// where outcomes stop changing — DAEDALUS on ewf-standings spends 113M
// units yet a 5M cap yields the byte-identical wire in 18.2s vs 39.6s
// (OMEGA_DET=1); metrics.tsv through TAGSTACK and lic-mit through
// ARCHETYPON are likewise byte-identical at 2-8M caps. New default keeps
// generous headroom over those knees while cutting pathological wrapper
// re-entry (1.45-7.37B units in X58 profiling) by ~20-50x. Outputs can
// only stay equal or grow where the cap binds; every codec still
// byte-verifies its decode, so fidelity is unaffected.
export const CHIRON_BUDGET_BASE = 4_000_000;
export const CHIRON_BUDGET_PER_CHAR = 500;

export function chironBudgetFor(chars: number): number {
  const env = typeof process !== 'undefined' ? process.env?.OMEGA_CHIRON_BUDGET : undefined;
  if (env !== undefined && env !== '') {
    const n = Number(env);
    if (Number.isFinite(n)) return n <= 0 ? Number.POSITIVE_INFINITY : n;
  }
  return Math.round((CHIRON_BUDGET_BASE + CHIRON_BUDGET_PER_CHAR * Math.max(0, chars)) * x93ChironFactor(chars));
}
