import {
  commitRunCostDelta,
  prepareRuns,
  prepareRunCostState,
  runCostPrepared,
  scoreRunCostDelta,
} from '../../src/lib/omega/ariadne';
import type { EncodingName } from '../../src/lib/omega/bpe';

const enc: EncodingName = 'o200k_base';
const refs = [11, 12, 13, 14, 15, 16];
const runs = [
  [11, 12], [11, 12], [11, 13, 14], [13, 14, 11],
  [12, 12, 13], [14, 11], [14, 11], [11, 12, 13, 14],
  [15, 12, 16], [16, 15, 16],
];
const prepared = prepareRuns(runs);
const chars = [...'abcdefuvwxyz'];
let seed = 0x47d311;
const rand = (n: number): number => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const assert = (ok: boolean, message: string): void => {
  if (!ok) throw new Error(message);
};
const mapFor = (values: string[]) => new Map(refs.map((r, i) => [r, values[i]]));

let current = ['a', 'b', 'c', 'd', 'e', 'f'];
const cache = new Map<string, number>();
const state = prepareRunCostState(prepared, refs, current, enc, cache);
assert(state.total === runCostPrepared(prepared, mapFor(current), enc, new Map()), 'initial baseline mismatch');

let checked = 0;
for (let trialNo = 0; trialNo < 500; trialNo++) {
  // Generate a unique assignment with both swaps and replacement moves.
  const pool = chars.slice();
  const next: string[] = [];
  while (next.length < refs.length) next.push(pool.splice(rand(pool.length), 1)[0]);
  const delta = scoreRunCostDelta(prepared, state, current, next, enc, cache);
  const full = runCostPrepared(prepared, mapFor(next), enc, new Map());
  assert(delta.total === full, `delta mismatch at trial ${trialNo}: ${delta.total} != ${full}`);
  assert(delta.updates.length <= prepared.pats.length, `too many pattern updates at trial ${trialNo}`);
  checked++;

  // Alternate commits and rejected trials to exercise state isolation.
  if (trialNo % 2 === 0) {
    commitRunCostDelta(state, delta);
    current = next;
    const committedFull = runCostPrepared(prepared, mapFor(current), enc, new Map());
    assert(state.total === committedFull, `committed state mismatch at trial ${trialNo}`);
  }
}

console.log(`PASS assignment-delta: ${checked} exact candidate scores, ${Math.floor(checked / 2)} committed transitions, ${prepared.pats.length} distinct patterns`);
