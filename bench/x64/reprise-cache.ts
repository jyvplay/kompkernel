import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { repriseCacheClear, repriseCacheStats, repriseEncode } from '../../src/lib/omega/reprise';

const sourcePath = 'bench/holdout-x40/metrics.tsv';
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
repriseCacheClear();
const coldStart = performance.now();
const cold = repriseEncode(source, 'o200k_base');
const coldElapsedMs = performance.now() - coldStart;
const coldStats = repriseCacheStats();
const coldMessage = cold.message;
const coldWire = cold.wire;
const coldTokens = cold.messageTokens;
// Adversarial cache-poisoning probe: callers receive mutable result records.
// A caller mutation must not alter the separately stored memoized copy.
cold.message = 'attacker-poisoned-message';
cold.wire = 'attacker-poisoned-wire';
cold.frontierCosts.apographe = -1;
const warmStart = performance.now();
const warm = repriseEncode(source, 'o200k_base');
const warmElapsedMs = performance.now() - warmStart;
const warmStats = repriseCacheStats();
const sameMessage = coldMessage === warm.message && coldWire === warm.wire;
const resultExact = warm.exact && warm.decoded === source && warm.message !== 'attacker-poisoned-message';
const sameCost = coldTokens === warm.messageTokens && countTokens(warm.message, 'o200k_base') === warm.messageTokens;
const oneMissOneHit = coldStats.misses === 1 && coldStats.hits === 0 && warmStats.misses === 1 && warmStats.hits === 1;
const mutationIsolated = warm.frontierCosts.apographe !== -1;
const speedRatio = warmElapsedMs === 0 ? Infinity : coldElapsedMs / warmElapsedMs;
const checks = [
  { name: 'cold full TAGSTACK result is exact and frontier-complete', pass: resultExact && cold.frontierComplete },
  { name: 'warm repeat reuses byte-identical self-contained message', pass: sameMessage },
  { name: 'warm repeat preserves complete-message token cost', pass: sameCost },
  { name: 'cache accounting records one miss then one hit', pass: oneMissOneHit },
  { name: 'caller mutation cannot poison the memoized result', pass: mutationIsolated },
  { name: 'warm exact-repeat encode is at least 10x faster', pass: warmElapsedMs < coldElapsedMs / 10 },
];
const receipt = {
  runtime: process.version, fixture: sourcePath, sourceSha256, sourceChars: source.length,
  config: { encoding: 'o200k_base', OMEGA_DET: process.env.OMEGA_DET ?? null,
    OMEGA_WORK_BUDGET: process.env.OMEGA_WORK_BUDGET ?? null,
    OMEGA_CHIRON_BUDGET: process.env.OMEGA_CHIRON_BUDGET ?? null },
  result: { exact: cold.exact, frontierComplete: cold.frontierComplete,
    messageTokens: cold.messageTokens, parentTokens: cold.parentTokens,
    parentCodec: cold.parentCodec, applied: cold.applied,
    coldElapsedMs: Math.round(coldElapsedMs * 1000) / 1000,
    warmElapsedMs: Math.round(warmElapsedMs * 1000) / 1000,
    speedup: Number.isFinite(speedRatio) ? Math.round(speedRatio * 100) / 100 : 'timer-resolution-infinite' },
  sameWireSha256: crypto.createHash('sha256').update(coldMessage).digest('hex'),
  coldStats, warmStats, checks,
};
fs.mkdirSync('bench/x64/receipts', { recursive: true });
fs.writeFileSync('bench/x64/receipts/reprise-cache.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (checks.some((c) => !c.pass)) process.exitCode = 1;
