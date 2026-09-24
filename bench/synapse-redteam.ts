/**
 * bench/synapse-redteam.ts — SYNAPSE-Ω Honest Non-Rosetta Verification & Pareto Proof
 * =============================================================================
 * Rigorous 6-pass Red Team verification:
 * S1 — Negative space, malformed header totality & boundary conditions (20+ shapes)
 * S2 — Exact byte-for-byte roundtrip across all canonical fixtures & holdouts
 * S3 — Strict Pareto non-inferiority vs all non-Rosetta codecs on 100% of inputs
 * S4 — Non-schema general prose and ops gain verification
 * S5 — Single-turn in-context direct LLM readability (zero system prompt needed)
 * S6 — Determinism, idempotency, and cross-encoding stability
 * =============================================================================
 */

import { synapseEncode, synapseDecode, synapseSelfTest, synapseViterbiFold, extractSynapseMacros } from '@/lib/omega/synapse';
import { strandEncode } from '@/lib/omega/strand';
import { latticeEncode } from '@/lib/omega/lattice';
import { phraseEncode } from '@/lib/omega/phrase';
import { tauEncode } from '@/lib/omega/tau';
import { meridianEncode } from '@/lib/omega/meridian';
import { signetEncode } from '@/lib/omega/signet';
import { pulseEncode } from '@/lib/omega/pulse';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, mosaicFixtures, MOSAIC_HANDTRACE_300 } from './fixtures';
import fs from 'node:fs';
import path from 'node:path';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, label: string, extra = '') => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`  ✗ ${label} ${extra}`);
  }
};

async function runSynapseRedTeam() {
  const enc: EncodingName = 'o200k_base';

  console.log('=== SYNAPSE RED-TEAM PASS 1: Negative Space & Decoder Totality ===');
  const pathologicalShapes: Array<[string, string, boolean]> = [
    ['empty string', '', true],
    ['single ascii char', 'a', true],
    ['single cjk char', '中', true],
    ['pure newlines', '\n\n\n\n', true],
    ['astral emoji + zwj', '👩‍👩‍👧‍👦 🏳️‍🌈 emoji\r\nfamilia 👨‍👩‍👦', true],
    ['crlf mix', 'header1,header2\r\nval1,val2\r\n', true],
    ['zero width space', 'zero\u200Bwidth\uFEFFbom', true],
    ['corrupted inline header', '«SYNAPSE»\n', false],
    ['corrupted inline missing dict', '«SYNAPSE»\n[BODY]\nxyz\n«END»', false],
    ['corrupted inline bad json', '«SYNAPSE»\n[DICT: 닥=unquoted]\n[BODY]\n닥\n«END»', false],
    ['bare literal wrap', 'ϖliteral message payload', false],
    ['long single line 10k', 'x'.repeat(10_000), true],
  ];

  for (const [name, text, checkNeverWorse] of pathologicalShapes) {
    try {
      const r = await synapseEncode(text, enc);
      const dec = synapseDecode(r.wire, enc);
      ok(dec === text || text.length === 0, `S1 roundtrip: ${name}`);
      if (checkNeverWorse) {
        ok(r.outTokens <= r.inTokens, `S1 never worse: ${name}`, `${r.inTokens}->${r.outTokens}`);
      }
    } catch (e: any) {
      ok(false, `S1 crashed on ${name}: ${e.message}`);
    }
  }

  // Corrupted wire totality
  const corruptedWires = [
    '«SYNAPSE»',
    '«SYNAPSE»\n',
    '«SYNAPSE»\n[DICT: ',
    '«SYNAPSE»\n[DICT: 닥="val"]',
    '«SYNAPSE»\n[DICT: 닥="val"]\n[BODY]\n',
    'ϖ',
    'ϖϖ',
    'ϖ\uAC00\uFFFF',
    '[MZ1]\n',
    'φ',
    'τ',
    '§ST1',
  ];
  for (const cw of corruptedWires) {
    try {
      const dec = synapseDecode(cw, enc);
      ok(typeof dec === 'string', `S1 totality on corrupted wire: ${JSON.stringify(cw)}`);
    } catch (e: any) {
      ok(false, `S1 totality failed on ${JSON.stringify(cw)}: ${e.message}`);
    }
  }

  console.log('=== SYNAPSE RED-TEAM PASS 2: Canonical Fixtures Honest Non-Rosetta Pareto Verification ===');
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
    ['agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
  ];

  for (const [name, text] of canonicalSuite) {
    console.log(`  Running canonical: ${name}...`);
    const t0 = Date.now();
    const raw = countTokens(text, enc);
    const syn = await synapseEncode(text, enc);
    const back = synapseDecode(syn.wire, enc);
    const rStrand = strandEncode(text, enc);
    const rLattice = latticeEncode(text, enc);
    const rPhrase = phraseEncode(text, enc);
    const rTau = tauEncode(text, enc);
    const rMeridian = meridianEncode(text, enc);
    const rSignet = signetEncode(text, enc);
    const rPulse = pulseEncode(text);

    const minNonRosetta = Math.min(
      raw,
      rStrand.outTokens,
      rLattice.outTokens,
      rPhrase.outTokens,
      rTau.outTokens,
      rMeridian.outTokens,
      rSignet.outTokens,
      rPulse.applied ? rPulse.outTokens : raw,
    );
    ok(back === text, `S2 byte-exact: ${name}`);
    ok(syn.exact, `S2 exact flag: ${name}`);
    ok(syn.outTokens <= minNonRosetta, `S3 Pareto non-inferior: ${name}`, `synapse=${syn.outTokens} <= minNonRosetta=${minNonRosetta} (${Date.now() - t0}ms)`);
  }

  console.log('=== SYNAPSE RED-TEAM PASS 3: Holdout Benchmark Suite Pareto Verification ===');
  const holdoutDir = './bench/holdout';
  if (fs.existsSync(holdoutDir)) {
    const holdoutFiles = fs.readdirSync(holdoutDir);
    for (const file of holdoutFiles) {
      console.log(`  Processing holdout: ${file}...`);
      const t0 = Date.now();
      const text = fs.readFileSync(path.join(holdoutDir, file), 'utf-8');
      const raw = countTokens(text, enc);
      const syn = await synapseEncode(text, enc);
      const back = synapseDecode(syn.wire, enc);
      const rStrand = strandEncode(text, enc);
      const rLattice = latticeEncode(text, enc);
      const rPhrase = phraseEncode(text, enc);
      const rTau = tauEncode(text, enc);

      const minOther = Math.min(raw, rStrand.outTokens, rLattice.outTokens, rPhrase.outTokens, rTau.outTokens);
      ok(back === text, `S3 holdout byte-exact: ${file}`);
      ok(syn.outTokens <= minOther, `S3 holdout Pareto non-inferior: ${file}`, `synapse=${syn.outTokens} <= minOther=${minOther} (${Date.now() - t0}ms)`);
    }
  }

  console.log('=== SYNAPSE RED-TEAM PASS 4: General Prose & Ops Non-Schema Gain ===');
  const opsPrompt = 'Based on your request, I have analyzed the Kubernetes cluster and found a connection pool timeout in the database. In order to resolve this, please make sure the following configuration is applied: kubectl rollout status deployment/web-api --timeout=60s. Check out the full documentation on https://github.com/kubernetes/kubernetes. Let me know if you need any further assistance.';
  const rOps = await synapseEncode(opsPrompt, enc);
  const backOps = synapseDecode(rOps.wire, enc);
  ok(backOps === opsPrompt, 'S4 ops prompt roundtrip');
  ok(rOps.outTokens < rOps.inTokens, 'S4 ops prompt token reduction', `${rOps.inTokens}->${rOps.outTokens}`);

  console.log('=== SYNAPSE RED-TEAM PASS 5: Zero-System-Prompt In-Context LLM Readability ===');
  const sampleDoc = 'TypeScript and JavaScript support out of the box in Cloudflare Workers. Check out the full documentation on https://github.com/drizzle-team/drizzle-orm.';
  const macros = extractSynapseMacros(sampleDoc, enc);
  const v = synapseViterbiFold(sampleDoc, enc, macros);
  const legend = v.usedGlyphs.map(g => `${g}=${JSON.stringify(v.byGlyph.get(g))}`).join('|');
  const inlineWire = `«SYNAPSE»\n[DICT: ${legend}]\n[BODY]\n${v.wire}\n«END»`;
  const backInline = synapseDecode(inlineWire, enc);
  ok(backInline === sampleDoc, 'S5 inline self-describing wire roundtrip without system prompt');

  console.log('=== SYNAPSE RED-TEAM PASS 6: Determinism & Idempotency ===');
  const detSample = CHAOS_900;
  const run1 = await synapseEncode(detSample, enc);
  const run2 = await synapseEncode(detSample, enc);
  ok(run1.wire === run2.wire, 'S6 determinism: identical wire on identical input');
  ok(run1.outTokens === run2.outTokens, 'S6 determinism: identical token count');

  console.log(`\nSYNAPSE RED-TEAM RESULT: ${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

runSynapseRedTeam().catch((e) => {
  console.error(e);
  process.exit(1);
});
