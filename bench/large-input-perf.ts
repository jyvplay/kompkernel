/**
 * bench/large-input-perf.ts — 80% Code / 20% Prose Heterogeneous Capacity Benchmark
 */

import { rosettaEncode, rosettaDecode } from '../src/lib/omega/rosetta';
import { countTokens } from '../src/lib/omega/bpe';

function generateHeteroCodeProsePayload(targetChars: number): string {
  // 80% code block, 20% prose block
  const codeSnippet = (id: number) => `
export interface SvcConfig_${id} {
  id: number;
  region: "us-east-1" | "eu-west-1" | "ap-south-1";
  active: boolean;
  timestamp: string;
  endpoints: string[];
}

export async function syncGateway_${id}(cfg: SvcConfig_${id}) {
  const payload = {
    job: "sync_batch",
    shard_id: ${id % 16},
    retries: ${id % 4},
    ok: true,
    tags: ["prod", "v2", "node_${id}"],
    latency_ms: ${120 + (id * 13) % 400}
  };
  if (cfg.timestamp === '2026-09-15T06:02:11Z') {
    return { status: 200, data: payload };
  }
  return { status: 500, error: "timeout" };
}

// region,dc,hosts,errors
// us-east-1,iad-3,${42 + id},0
// eu-west-1,dub-1,${10 + id},2
// ap-south-1,bom-2,${9 + id},1
`;

  const proseSnippet = (id: number) => `
Deployment Status Report #${id}:
The sync gateway pipeline completed shard rebalancing across us-east-1 and eu-west-1.
On-call was paged during the window due to a transient TLS handshake timeout.
Database migration completed successfully. Cache warmup was retried and verified.
Audit timestamp: 2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s).
Next steps: bump connection pool limits, verify memory usage, and monitor retry budget.
`;

  let current = '';
  let id = 0;
  while (current.length < targetChars) {
    const codeBlock = codeSnippet(id);
    const proseBlock = proseSnippet(id);
    current += codeBlock + codeBlock + codeBlock + codeBlock + proseBlock;
    id++;
  }
  return current.slice(0, targetChars);
}

async function runBenchmark() {
  console.log('=== 80% CODE / 20% PROSE HETERO CAPACITY BENCHMARK ===\n');

  const testSizes = [100_000, 200_000, 500_000, 1_000_000];

  for (const size of testSizes) {
    const input = generateHeteroCodeProsePayload(size);
    const inTokens = countTokens(input, 'o200k_base');

    const t0 = performance.now();
    const res = await rosettaEncode(input, 'o200k_base');
    const encodeMs = performance.now() - t0;

    const t1 = performance.now();
    const decoded = rosettaDecode(res.wire, 'o200k_base');
    const decodeMs = performance.now() - t1;

    const exact = decoded === input;
    const wireChars = res.wire.length;
    const fitsIn65k = wireChars <= 65_000;
    const fitsIn120k = wireChars <= 120_000;

    console.log(`Input Size: ${input.length.toLocaleString()} chars (${inTokens.toLocaleString()} tokens)`);
    console.log(`  - Wire Size: ${wireChars.toLocaleString()} chars (${res.outTokens.toLocaleString()} tokens)`);
    console.log(`  - Character Compression: ${((1 - wireChars / input.length) * 100).toFixed(2)}% reduction`);
    console.log(`  - Fits 65k Budget: ${fitsIn65k ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Fits 120k Budget: ${fitsIn120k ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Exact Roundtrip: ${exact ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  - Member Used: ${res.member}`);
    console.log(`  - Time: Encode ${encodeMs.toFixed(1)} ms | Decode ${decodeMs.toFixed(1)} ms\n`);

    if (!exact) {
      console.error('FATAL: Roundtrip verification failed!');
      process.exit(1);
    }
  }

  // Maximum capacity determination for 65k and 120k wire budgets
  console.log('--- CAPACITY BOUNDARIES FOR WIRE OUTPUT BUDGETS ---');

  // 65k Wire Budget Capacity
  let cap65k = 0;
  for (let sz = 50_000; sz <= 300_000; sz += 10_000) {
    const input = generateHeteroCodeProsePayload(sz);
    const res = await rosettaEncode(input, 'o200k_base');
    if (res.wire.length <= 65_000) {
      cap65k = sz;
    } else {
      break;
    }
  }

  // 120k Wire Budget Capacity
  let cap120k = 0;
  for (let sz = 100_000; sz <= 500_000; sz += 10_000) {
    const input = generateHeteroCodeProsePayload(sz);
    const res = await rosettaEncode(input, 'o200k_base');
    if (res.wire.length <= 120_000) {
      cap120k = sz;
    } else {
      break;
    }
  }

  console.log(`  - Max 80/20 Hetero Input for 65,000 Wire Output Budget: ~${cap65k.toLocaleString()} characters`);
  console.log(`  - Max 80/20 Hetero Input for 120,000 Wire Output Budget: ~${cap120k.toLocaleString()} characters\n`);

  console.log('🎉 ALL HETERO CAPACITY BENCHMARKS PASSED PERFECTLY!');
}

runBenchmark().catch((err) => {
  console.error('Error during capacity benchmark:', err);
  process.exit(1);
});
