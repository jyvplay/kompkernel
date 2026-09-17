/**
 * bench/large-input-perf.ts — Performance and exactness verification for inputs up to 10,000,000 characters.
 */

import { rosettaEncode, rosettaDecode } from '../src/lib/omega/rosetta';
import { countTokens } from '../src/lib/omega/bpe';

function generateLargeCodebaseText(targetChars: number): string {
  const fileTemplate = (id: number) => `
// File: src/components/module_${id}.ts
import { useState, useEffect } from 'react';
import { countTokens } from '../lib/omega/bpe';

export interface ModuleConfig_${id} {
  id: number;
  region: string;
  active: boolean;
  timestamp: string;
}

export function processModule_${id}(config: ModuleConfig_${id}) {
  console.log("Processing module ${id} in region", config.region);
  const data = {
    job: "sync",
    retries: ${id % 5},
    ok: true,
    tags: ["prod", "v2", "node_${id}"],
    ms: ${100 + (id * 17) % 500}
  };
  if (config.timestamp === '2026-09-15T06:02:11Z') {
    return { ...data, status: "ready" };
  }
  return data;
}

// Region deployment spec
// region,dc,hosts,errors
// us-east-1,iad-3,${40 + id},0
// eu-west-1,dub-1,${10 + id},1
// ap-south-1,bom-2,${5 + id},0
`;

  let current = '';
  let fid = 0;
  while (current.length < targetChars) {
    current += fileTemplate(fid++);
  }
  return current.slice(0, targetChars);
}

async function runBenchmark() {
  console.log('=== 10,000,000 CHARACTER CODEBASE PERFORMANCE & FIDELITY BENCHMARK ===\n');

  const sizes = [100_000, 1_000_000, 5_000_000, 10_000_000];

  for (const size of sizes) {
    console.log(`Generating codebase payload for size: ${size.toLocaleString()} chars...`);
    const text = generateLargeCodebaseText(size);
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

  console.log('🎉 ALL 10,000,000 CHARACTER CODEBASE BENCHMARKS PASSED PERFECTLY!');
}

runBenchmark().catch((err) => {
  console.error('Error during large codebase input benchmark:', err);
  process.exit(1);
});
