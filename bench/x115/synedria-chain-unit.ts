/** X115 EPISYNEDRIA chain-council unit probes. No tokenizer, no corpus, no clock. */
import * as assert from 'node:assert';
import { workEpoch, workUsed, chironUsedUnits, workConsume, chironConsume } from '../../src/lib/omega/workmeter';
import { synedriaChainScope, synedriaChainDisabled, synedriaKey, synedriaMemo, synedriaReset, synedriaStats } from '../../src/lib/omega/synedria';

delete process.env.OMEGA_NO_SYNEDRIA;
delete process.env.OMEGA_SYNEDRIA;
delete process.env.OMEGA_NO_SYNEDRIA_CHAIN;
delete process.env.OMEGA_SYNEDRIA_CHAIN;
synedriaReset();
let calls = 0;
const run = () => { calls++; workConsume(7); chironConsume(3); return { a: [1, 2] }; };

// Nested chain scopes join one council; the second fresh epoch hits and replays.
calls = 0;
const pair = synedriaChainScope(() => {
  const a = workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4);
  const b = synedriaChainScope(() => workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4));
  return { a, b };
});
assert.strictEqual(calls, 1);
assert.strictEqual(synedriaStats.scopes, 1);
assert.strictEqual(synedriaStats.joined, 1);
assert.strictEqual(synedriaStats.hits, 1);
assert.strictEqual(workUsed(), 0); // outermost epoch restored
assert.notStrictEqual(pair.a, pair.b);
pair.b.a.push(99);
assert.deepStrictEqual(pair.a.a, [1, 2]);

// No cross-document retention.
calls = 0;
synedriaChainScope(() => workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4));
synedriaChainScope(() => workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4));
assert.strictEqual(calls, 2);

// Differing text/options/encoding do not alias.
calls = 0;
synedriaChainScope(() => {
  workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4);
  workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text2', 'opts'), run), 4);
  workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts2'), run), 4);
  workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'cl100k_base', 'text', 'opts'), run), 4);
});
assert.strictEqual(calls, 4);

// Exception pops exactly its council.
assert.throws(() => synedriaChainScope(() => { throw new Error('x'); }));
calls = 0;
synedriaChainScope(() => workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4));
assert.strictEqual(calls, 1);

// Chain disabled degrades to independent councils (X114 semantics).
process.env.OMEGA_SYNEDRIA_CHAIN = '0';
assert.strictEqual(synedriaChainDisabled(), true);
calls = 0;
synedriaChainScope(() => workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4));
synedriaChainScope(() => workEpoch(100, () => synedriaMemo(synedriaKey('probe', 'o200k_base', 'text', 'opts'), run), 4));
assert.strictEqual(calls, 2);
delete process.env.OMEGA_SYNEDRIA_CHAIN;

console.log('EPISYNEDRIA chain unit PASS', JSON.stringify({ hits: synedriaStats.hits, joined: synedriaStats.joined, scopes: synedriaStats.scopes }));
