/**
 * X114 SYNEDRIA soundness unit probes. No tokenizer, no corpus, no clock.
 * Checks: fresh-epoch hit replays the exact meter delta; results are cloned;
 * nested/mid-epoch calls bypass; the council is discarded on scope exit;
 * OMEGA_SYNEDRIA=0 disables.
 */
import * as assert from 'node:assert';
import { workEpoch, workState, workUsed, chironUsedUnits, workConsume, chironConsume } from '../../src/lib/omega/workmeter';
import { synedriaScope, synedriaKey, synedriaMemo, synedriaReset, synedriaStats } from '../../src/lib/omega/synedria';

process.env.OMEGA_SYNEDRIA = '1';
synedriaReset();
let calls = 0;
const run = () => { calls++; workConsume(7); chironConsume(3); return { a: [1, 2] }; };

const first = synedriaScope(() => workEpoch(100, () => {
  const key = synedriaKey('probe', 'o200k_base', 'text', 'opts');
  assert.notStrictEqual(key, null);
  const r = synedriaMemo(key, run);
  return { r, used: workUsed(), chiron: chironUsedUnits() };
}, 4));
assert.strictEqual(calls, 1);
assert.strictEqual(first.used, 7);
assert.strictEqual(first.chiron, 3);

const second = synedriaScope(() => workEpoch(100, () => {
  const key = synedriaKey('probe', 'o200k_base', 'text', 'opts');
  const r = synedriaMemo(key, run);
  return { r, used: workUsed(), chiron: chironUsedUnits() };
}, 4));
// A new council was opened, so this is a miss by design: councils do not share.
assert.strictEqual(calls, 2);
assert.strictEqual(second.used, 7);
assert.strictEqual(second.chiron, 3);

// Same council, two fresh parent epochs: the second is a hit and replays.
calls = 0;
const pair = synedriaScope(() => {
  const a = workEpoch(100, () => {
    const key = synedriaKey('probe', 'o200k_base', 'text', 'opts');
    const r = synedriaMemo(key, run);
    return { r, used: workUsed(), chiron: chironUsedUnits() };
  }, 4);
  const b = workEpoch(100, () => {
    const key = synedriaKey('probe', 'o200k_base', 'text', 'opts');
    const r = synedriaMemo(key, run);
    return { r, used: workUsed(), chiron: chironUsedUnits() };
  }, 4);
  return { a, b };
});
assert.strictEqual(calls, 1);
assert.strictEqual(pair.a.used, pair.b.used);
assert.strictEqual(pair.a.chiron, pair.b.chiron);
assert.notStrictEqual(pair.a.r, pair.b.r);
pair.b.r.a.push(99);
assert.deepStrictEqual(pair.a.r.a, [1, 2]);

// Mid-epoch call bypasses.
synedriaScope(() => workEpoch(100, () => {
  workConsume(1);
  assert.strictEqual(synedriaKey('probe', 'o200k_base', 'text', 'opts'), null);
}, 4));

// Outside a council there is no key.
assert.strictEqual(synedriaKey('probe', 'o200k_base', 'text', 'opts'), null);

// Disabled switch bypasses the council entirely.
process.env.OMEGA_SYNEDRIA = '0';
calls = 0;
const off = synedriaScope(() => workEpoch(100, () => {
  assert.strictEqual(synedriaKey('probe', 'o200k_base', 'text', 'opts'), null);
  return synedriaMemo(null, run);
}, 4));
assert.strictEqual(calls, 1);
assert.ok(off);
process.env.OMEGA_SYNEDRIA = '1';

console.log('SYNEDRIA unit probes PASS', JSON.stringify({ hits: synedriaStats.hits, stores: synedriaStats.stores, bypassNested: synedriaStats.bypassNested }));
