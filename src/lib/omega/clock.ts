/**
 * Search clock for the DAEDALUS / ARIADNE / SIBYL / CHIRON family.
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
 */
export const DET_MODE: boolean =
  typeof process !== 'undefined' && !!process.env && process.env.OMEGA_DET === '1';

export function now(): number {
  return DET_MODE ? 0 : Date.now();
}
