/**
 * bench/telos-redteam.ts — 6-Pass Adversarial Red-Team Test Suite for TELOS-Ω
 * =============================================================================
 * Rigorous formal testing of TELOS-Ω:
 *  - Pass 1: Canonical Non-Rosetta Benchmark Fixtures & Holdout Documents (Losslessness & Wire Reduction)
 *  - Pass 2: Negative Space, Boundary Mutations, Tag Collisions & Malformed Totality
 *  - Pass 3: Zero-System-Prompt Single-Turn Inline LLM Readability
 *  - Pass 4: Multi-Regime Heterogeneous Document Partitioning (Prose + CSV + JSON + Code)
 *  - Pass 5: Strict Non-Rosetta Pareto Dominance & Token Monotonicity
 *  - Pass 6: High-Concurrency, Determinism & Self-Test Verification
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  telosEncode,
  telosDecode,
  telosSelfTest,
  TELOS_INLINE_START,
  TELOS_INLINE_END,
  TELOS_COMPACT_PREFIX,
} from '../src/lib/omega/telos';
import { pantheonEncode } from '../src/lib/omega/pantheon';
import { apeironEncode } from '../src/lib/omega/apeiron';
import { noesisEncode } from '../src/lib/omega/noesis';
import { synapseEncode } from '../src/lib/omega/synapse';
import { strandEncode } from '../src/lib/omega/strand';
import { latticeEncode } from '../src/lib/omega/lattice';
import { phraseEncode } from '../src/lib/omega/phrase';
import { tauEncode } from '../src/lib/omega/tau';
import { meridianEncode } from '../src/lib/omega/meridian';
import { signetEncode } from '../src/lib/omega/signet';
import { pulseEncode } from '../src/lib/omega/pulse';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, mosaicFixtures, MOSAIC_HANDTRACE_300 } from './fixtures';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, name: string, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function runPass1() {
  console.log('\n=== PASS 1: CANONICAL NON-ROSETTA BENCHMARK SUITE ===');
  const enc: EncodingName = 'o200k_base';
  const f = mosaicFixtures();

  const canonicalSuite: Array<[string, string]> = [
    ['chaos-900', CHAOS_900],
    ['chaos-g', CHAOS_G_CJK],
    ['chaos-f', CHAOS_F_LLM_REPORT],
    ['handtrace-300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
  ];

  for (const [name, text] of canonicalSuite) {
    const res = await telosEncode(text, enc);
    const dec = telosDecode(res.wire, enc);
    assert(
      dec === text,
      `Lossless round-trip: ${name}`,
      `${res.inTokens} -> ${res.outTokens} tok (${res.savingsPct.toFixed(1)}% savings, mode: ${res.mode})`,
    );
    assert(
      res.outTokens <= res.inTokens,
      `Compression non-expansion: ${name}`,
      `out=${res.outTokens} <= in=${res.inTokens}`,
    );
  }

  // Holdout directory
  const holdoutDir = path.resolve('bench/holdout');
  if (fs.existsSync(holdoutDir)) {
    const files = fs.readdirSync(holdoutDir);
    for (const file of files) {
      const content = fs.readFileSync(path.join(holdoutDir, file), 'utf-8');
      const res = await telosEncode(content, enc);
      const dec = telosDecode(res.wire, enc);
      assert(
        dec === content,
        `Lossless round-trip holdout: ${file}`,
        `${res.inTokens} -> ${res.outTokens} tok (${res.savingsPct.toFixed(1)}% savings, mode: ${res.mode})`,
      );
      assert(
        res.outTokens <= res.inTokens,
        `Compression non-expansion holdout: ${file}`,
        `out=${res.outTokens} <= in=${res.inTokens}`,
      );
    }
  }

  // Multi-Regime agent turn fixture
  const agentTurn = [
    'User: Please inspect the cluster error logs and update the deployment manifest.',
    'Assistant: I will analyze the logs from `api-gateway` and patch the Kubernetes spec.',
    '```bash',
    'kubectl get pods -n production',
    'kubectl logs api-gateway-7f89d4b89-2x5pq -n production --tail=20',
    '```',
    'Error output observed:',
    '{"timestamp":"2026-09-23T14:20:00Z","level":"ERROR","service":"api-gateway","msg":"database connection timeout","ip":"10.244.1.45"}',
    '{"timestamp":"2026-09-23T14:20:01Z","level":"ERROR","service":"api-gateway","msg":"database connection timeout","ip":"10.244.1.45"}',
    '{"timestamp":"2026-09-23T14:20:02Z","level":"ERROR","service":"api-gateway","msg":"database connection timeout","ip":"10.244.1.45"}',
    'Resolution proposed: Increase connection pool size in `deployment.yaml`.',
  ].join('\n');

  const rAgent = await telosEncode(agentTurn, enc);
  const decAgent = telosDecode(rAgent.wire, enc);
  assert(
    decAgent === agentTurn,
    'Multi-regime agent turn lossless round-trip',
    `${rAgent.inTokens} -> ${rAgent.outTokens} tok (${rAgent.savingsPct.toFixed(1)}% savings, mode: ${rAgent.mode})`,
  );
  assert(
    rAgent.outTokens < rAgent.inTokens,
    'Multi-regime agent turn strict token reduction',
    `in=${rAgent.inTokens}, out=${rAgent.outTokens}`,
  );
}

async function runPass2() {
  console.log('\n=== PASS 2: ADVERSARIAL EDGE CASES & TOTALITY ===');
  const enc: EncodingName = 'o200k_base';

  const edgeCases = [
    { name: 'empty string', text: '' },
    { name: 'single whitespace', text: ' ' },
    { name: 'single newline', text: '\n' },
    { name: 'single ascii char', text: 'a' },
    { name: 'unicode emoji string', text: '🚀🔥✨🎉🧙‍♂️🧠' },
    { name: 'mixed scripts (Greek, Cyrillic, Kanji, Arabic)', text: 'Ωμέγα Русский 日本語 العربية עברית' },
    { name: 'wire tag injection inside text', text: '«TELOS»\n[DICT: bad]\n[BODY]\nfake body\n«END»' },
    { name: 'compact prefix collision', text: 'θThis text starts with theta' },
    { name: 'pantheon tag collision', text: '«PANTHEON»\n[DICT: test]\n[BODY]\ntest\n«END»' },
    { name: 'double theta collision', text: 'θθAlready escaped theta' },
    { name: 'repeated delimiters', text: '||||||||||||||||||||||||||||||||' },
    { name: 'massive newline run', text: '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n' },
  ];

  for (const ec of edgeCases) {
    const res = await telosEncode(ec.text, enc);
    const dec = telosDecode(res.wire, enc);
    assert(dec === ec.text, `Totality & Lossless: ${ec.name}`, `mode: ${res.mode}`);
  }

  // Malformed decoder test
  const malformedWires = [
    '«TELOS»',
    '«TELOS»\n[DICT: invalid=json="bad"|broken]\n[BODY]\nhello\n«END»',
    '«TELOS:MULTI»\n[B]\nonly_one_part\n«END»',
    'θ',
    '«TELOS:RAW»unclosed',
  ];

  for (const mw of malformedWires) {
    let didThrow = false;
    try {
      telosDecode(mw, enc);
    } catch {
      didThrow = true;
    }
    assert(!didThrow, `Decoder never throws on malformed wire: ${mw.slice(0, 25).replace(/\n/g, '\\n')}`);
  }
}

async function runPass3() {
  console.log('\n=== PASS 3: DUAL-PLANE ZERO-SYSTEM-PROMPT IN-CONTEXT VALIDATION ===');
  const enc: EncodingName = 'o200k_base';

  // Verify that an inline self-describing wire decodes purely with dictionary mappings
  const rawData = 'Production cluster us-east-1 experienced database connection timeout. ' +
    'The database connection timeout caused high memory utilization. ' +
    'Please investigate why database connection timeout and high memory utilization occurred in production cluster us-east-1.';

  const res = await telosEncode(rawData, enc);
  assert(res.exact, 'Inline dynamic macro induction exactness');
  const dec = telosDecode(res.wire, enc);
  assert(dec === rawData, 'In-context dictionary round-trip');

  // Verify that manual inline self-describing wire format parses without any external state
  const manualInline = [
    '«TELOS»',
    '[DICT: 닥="distributed consensus algorithm"|단="Byzantine fault tolerance"]',
    '[BODY]',
    'The system implements a robust 닥 supporting 2f+1 nodes with full 단 guarantees.',
    '«END»',
  ].join('\n');

  const expectedDecoded = 'The system implements a robust distributed consensus algorithm supporting 2f+1 nodes with full Byzantine fault tolerance guarantees.';
  const manualDec = telosDecode(manualInline, enc);
  assert(
    manualDec === expectedDecoded,
    'Zero-system-prompt single-turn inline wire unpacking',
    manualDec.slice(0, 45) + '...',
  );
}

async function runPass4() {
  console.log('\n=== PASS 4: MULTI-REGIME PARTITIONING & REASONING SCAFFOLDS ===');
  const enc: EncodingName = 'o200k_base';

  // Multi-regime document with distinct structural zones
  const multiRegimeDoc = [
    '# Microservice Telemetry Analysis Report',
    'This document summarizes the performance characteristics observed during the load test.',
    'All latency metrics are reported in milliseconds at the 99th percentile.',
    '',
    'id,timestamp,endpoint,latency_ms,status',
    '1,2026-09-23T10:00:00Z,/api/v1/auth,12.4,200',
    '2,2026-09-23T10:00:01Z,/api/v1/auth,14.1,200',
    '3,2026-09-23T10:00:02Z,/api/v1/auth,11.8,200',
    '4,2026-09-23T10:00:03Z,/api/v1/checkout,85.2,500',
    '5,2026-09-23T10:00:04Z,/api/v1/checkout,88.0,500',
    '',
    '--------------------------------------------------------------------------------',
    '================================================================================',
    '********************************************************************************',
    '',
    '{"level":"info","msg":"Worker pool rebalancing initiated","workers_idle":40,"workers_busy":10}',
    '{"level":"info","msg":"Worker pool rebalancing initiated","workers_idle":42,"workers_busy":8}',
    '{"level":"info","msg":"Worker pool rebalancing initiated","workers_idle":45,"workers_busy":5}',
  ].join('\n');

  const res = await telosEncode(multiRegimeDoc, enc);
  const dec = telosDecode(res.wire, enc);
  assert(dec === multiRegimeDoc, 'Multi-regime heterogeneous document lossless round-trip');
  assert(res.outTokens < res.inTokens, `Multi-regime token reduction (${res.inTokens} -> ${res.outTokens} tok, -${res.savingsPct.toFixed(1)}%)`);
}

async function runPass5() {
  console.log('\n=== PASS 5: STRICT NON-ROSETTA PARETO DOMINANCE ===');
  const enc: EncodingName = 'o200k_base';
  const f = mosaicFixtures();

  const testTexts = [
    f.prose,
    f.jsonLog,
    f.csv,
    CHAOS_900,
    'Terms and Conditions for use, reproduction, and distribution under Apache License, Version 2.0.',
    'async function handleRequest(request) { return new Response("OK", { status: 200 }); }',
    'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.',
  ];

  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    const rTelos = await telosEncode(text, enc);
    const rPantheon = await pantheonEncode(text, enc);
    const rApeiron = await apeironEncode(text, enc);
    const rNoesis = await noesisEncode(text, enc);
    const rSynapse = await synapseEncode(text, enc);
    const rPhrase = phraseEncode(text, enc);
    const rStrand = strandEncode(text, enc);
    const rLattice = latticeEncode(text, enc);
    const rTau = tauEncode(text, enc);
    const rMeridian = meridianEncode(text, enc);
    const rSignet = signetEncode(text, enc);
    const rPulse = pulseEncode(text);

    const minOther = Math.min(
      rTelos.inTokens,
      rPantheon.outTokens,
      rApeiron.outTokens,
      rNoesis.outTokens,
      rSynapse.outTokens,
      rPhrase.outTokens,
      rStrand.outTokens,
      rLattice.outTokens,
      rTau.outTokens,
      rMeridian.outTokens,
      rSignet.outTokens,
      rPulse.applied ? rPulse.outTokens : rTelos.inTokens,
    );

    assert(
      rTelos.outTokens <= minOther,
      `Strict Pareto Dominance [Test ${i + 1}]`,
      `Telos: ${rTelos.outTokens} <= MinBaseline: ${minOther} (in: ${rTelos.inTokens})`,
    );
  }
}

async function runPass6() {
  console.log('\n=== PASS 6: CONCURRENCY, DETERMINISM & SELF-TEST ===');
  const enc: EncodingName = 'o200k_base';

  // 1. Embedded self-tests
  const st = await telosSelfTest(enc);
  for (const s of st) {
    assert(s.pass, `Self-test: ${s.name}`, s.detail);
  }

  // 2. High-concurrency parallel encoding
  const sample = 'The quick brown fox jumps over the lazy dog in order to ensure that terms and conditions are met.';
  const promises = Array.from({ length: 30 }, () => telosEncode(sample, enc));
  const results = await Promise.all(promises);

  const firstWire = results[0].wire;
  const allIdentical = results.every((r) => r.wire === firstWire && r.exact);
  assert(allIdentical, '30-Way Concurrent Determinism & Cache Thread Safety');

  // 3. Idempotent decoding
  const decoded1 = telosDecode(firstWire, enc);
  const decoded2 = telosDecode(firstWire, enc);
  assert(decoded1 === sample && decoded2 === sample, 'Decoder idempotency across calls');
}

async function main() {
  console.log('===============================================================');
  console.log('     TELOS-Ω 6-PASS ADVERSARIAL RED-TEAM VERIFICATION SUITE    ');
  console.log('===============================================================');

  await runPass1();
  await runPass2();
  await runPass3();
  await runPass4();
  await runPass5();
  await runPass6();

  console.log('\n===============================================================');
  console.log(`TELOS-Ω RED-TEAM SUMMARY: ${passedTests}/${totalTests} tests passed (${failedTests} failures)`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal red-team error:', err);
  process.exit(1);
});
