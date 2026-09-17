/**
 * bench/large-input-perf.ts — Performance and exactness verification for inputs up to 2,000,000 characters.
 */

import { rosettaEncode, rosettaDecode } from '../src/lib/omega/rosetta';
import { countTokens } from '../src/lib/omega/bpe';

function generateLargeText(targetChars: number): string {
  const seed = [
    'Status: deploy finished, but two pods restart. Queue depth climbed while retry storm was live.',
    'region,dc,hosts,errors',
    'us-east-1,iad-3,42,0',
    'eu-west-1,dub-1,17,2',
    'ap-south-1,bom-2,9,1',
    '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}',
    'def run(ctx):\n    for k, v in ctx.items():\n        if v is None: raise ValueError(k)\n    return sum(ctx.values())',
    '2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s)',
    'kubectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts',
    'Actions: pause indexer, drain shard 7, then verify counts.'
  ].join('\n');

  let current = seed;
  while (current.length < targetChars) {
    current += '\n' + seed;
  }
  return current.slice(0, targetChars);
}

async function runBenchmark() {
  console.log('=== LARGE INPUT PERFORMANCE & FIDELITY BENCHMARK ===\n');

  const sizes = [100_000, 500_000, 1_000_000, 2_000_000];

  for (const size of sizes) {
    console.log(`Generating payload for size: ${size.toLocaleString()} chars...`);
    const text = generateLargeText(size);
    const inTokens = countTokens(text, 'o200k_base');

    console.log(`Input: ${text.length.toLocaleString()} chars, ${inTokens.toLocaleString()} tokens.`);

    const t0 = performance.now();
    const res = await rosettaEncode(text, 'o200k_base');
    const encodeMs = performance.now() - t0;

    const t1 = performance.now();
    const decoded = rosettaDecode(res.wire, 'o200k_base');
    const decodeMs = performance.now() - t1;

    const exact = decoded === text;
    const savings = res.inTokens ? (((res.inTokens - res.outTokens) / res.inTokens) * 100).toFixed(2) : '0';

    console.log(`Results for ${size.toLocaleString()} chars:`);
    console.log(`  - Exact Roundtrip: ${exact ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  - Wire Tokens: ${res.outTokens.toLocaleString()} (${savings}% token savings)`);
    console.log(`  - Encode Time: ${encodeMs.toFixed(1)} ms`);
    console.log(`  - Decode Time: ${decodeMs.toFixed(1)} ms`);
    console.log(`  - Member Used: ${res.member}`);
    console.log(`  - Throughput: ${((text.length / (encodeMs / 1000)) / 1_000_000).toFixed(2)} MB/s\n`);

    if (!exact) {
      console.error(`FATAL: Exactness check failed for size ${size}!`);
      process.exit(1);
    }
  }

  console.log('🎉 ALL LARGE INPUT BENCHMARKS PASSED PERFECTLY!');
}

runBenchmark().catch((err) => {
  console.error('Error during large input benchmark:', err);
  process.exit(1);
});
