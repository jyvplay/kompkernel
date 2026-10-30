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
 * This module has no imports (no cycles) and no other state.
 */

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

export function workBudgetFor(chars: number): number {
  const env = typeof process !== 'undefined' ? process.env?.OMEGA_WORK_BUDGET : undefined;
  if (env !== undefined && env !== '') {
    const n = Number(env);
    if (Number.isFinite(n)) return n <= 0 ? Number.POSITIVE_INFINITY : n;
  }
  return WORK_BUDGET_BASE + WORK_BUDGET_PER_CHAR * Math.max(0, chars);
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

export const CHIRON_BUDGET_BASE = 400_000_000;
export const CHIRON_BUDGET_PER_CHAR = 20_000;

export function chironBudgetFor(chars: number): number {
  const env = typeof process !== 'undefined' ? process.env?.OMEGA_CHIRON_BUDGET : undefined;
  if (env !== undefined && env !== '') {
    const n = Number(env);
    if (Number.isFinite(n)) return n <= 0 ? Number.POSITIVE_INFINITY : n;
  }
  return CHIRON_BUDGET_BASE + CHIRON_BUDGET_PER_CHAR * Math.max(0, chars);
}
