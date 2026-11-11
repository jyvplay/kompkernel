/**
 * src/lib/omega/clock.ts
 * =============================================================================
 * The single search clock for the DAEDALUS / ARIADNE / SIBYL / CHIRON family.
 *
 * Normal runs (app, UI): wall clock, as before.
 * OMEGA_DET=1 (measurement runs): the clock is the constant 0. Every
 * `now() < deadline` gate then stays open (the deadlines are finite, so
 * `0 < deadline` holds and `0 >= deadline` never does), so each search runs to
 * its own natural end. The output is then a pure function of the input and does
 * not depend on machine load. Timing fields (`ms`) read 0 in this mode.
 *
 * Measured motivation (z13): the same DAEDALUS input gave different wires under
 * load, because the second arm and the search loops were cut at wall-clock
 * deadlines.
 *
 * ---------------------------------------------------------------------------
 * X104 — THE FLAG WAS NEVER LIVE, AND THAT IS WHY NOTHING REPRODUCED.
 * ---------------------------------------------------------------------------
 * This module used to export
 *
 *     export const DET_MODE = ... process.env.OMEGA_DET === '1';
 *
 * a module-load-time constant. Every probe in this repository sets
 * `process.env.OMEGA_DET = '1'` in its own module body, and ESM evaluates every
 * imported module BEFORE the importing module's body runs. In the esbuild
 * bundle the probe's assignment lands tens of thousands of lines after
 * `DET_MODE` is computed, so `DET_MODE` was always `false` and `now()` always
 * returned real wall-clock time. The consequence, measured today:
 *
 *   - bench/x104/callsites.mjs records 105 012 calls to `Date.now()` that
 *     arrive THROUGH clock.ts's own `return DET_MODE ? 0 : Date.now();` line.
 *     A frozen clock cannot call Date.now(); that line was executing the live
 *     branch.
 *   - bench/x104/clockaudit.mjs, which patches the global clocks to run one
 *     second per call, moves code-ts from 967 to 1 397 tokens and apt-real
 *     from 835 to 2 521. Wall-clock gates were therefore live and truncating
 *     searches on every lane.
 *
 * So every "under OMEGA_DET=1" figure recorded in this repository -- including
 * the byte-exact 29/29 receipts -- was taken with live wall clocks, and the
 * run-to-run noise of about +/-3 tokens that X103 attributed to the OURA memo
 * was this. The fix is to read the flag per call, so that setting the variable
 * in a probe body actually takes effect. `isDet()` is now the only reader; the
 * old `DET_MODE` export is gone, and its one consumer (metathesis.ts:229) reads
 * `isDet()` instead.
 *
 * X104 also routed every wall-clock GATE in the 148 modules reachable from
 * tagstack through `now()` (tachos, tachys, aion, eidos, glossia, akribeia,
 * hyle, polytropos, syntomia, hydra, echo, hermes, logistike, eustochia, lethe,
 * mnemosyne, nyx, oracle, palimpsest, bifront, sibyl). Modules that read the
 * clock only to fill an `ms:` report field still read it directly, because a
 * report field cannot change a wire. The load-bearing exception is
 * hyle.ts:1470, which computes a BUDGET from a clock (`deadline - now()`) and
 * passes it into kiones/polytropos as a search stop; that one is routed too,
 * because a clock-derived budget is a gate wearing a different name.
 */
export function isDet(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_DET === '1';
}

export function now(): number {
  return isDet() ? 0 : Date.now();
}
