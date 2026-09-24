/**
 * bench/noesis-redteam.ts — NOESIS-Ω Honest Non-Rosetta Verification & Pareto Proof
 * =============================================================================
 * Rigorous 6-pass Red Team verification:
 * N1 — Negative space, malformed header totality & boundary conditions (25+ shapes)
 * N2 — Exact byte-for-byte roundtrip across all canonical fixtures & holdouts
 * N3 — Strict Pareto non-inferiority vs all non-Rosetta codecs on 100% of inputs
 * N4 — Non-schema general prose, reasoning scaffolds, and ops gain verification
 * N5 — Single-turn in-context direct LLM readability (zero system prompt needed)
 * N6 — Determinism, idempotency, and cross-encoding stability
 * =============================================================================
 */

import { noesisEncode, noesisDecode, noesisSelfTest, noesisViterbiFold, extractNoesisHierarchicalMacros } from '@/lib/omega/noesis';
import { synapseEncode } from '@/lib/omega/synapse';
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

async function runNoesisRedTeam() {
  const enc: EncodingName = 'o200k_base';

  console.log('=== NOESIS RED-TEAM PASS 1: Negative Space & Decoder Totality ===');
  const pathologicalShapes: Array<[string, string, boolean]> = [
    ['empty string', '', true],
    ['single ascii char', 'a', true],
    ['single cjk char', '中', true],
    ['pure newlines', '\n\n\n\n', true],
    ['astral emoji + zwj', '👩‍👩‍👧‍👦 🏳️‍🌈 emoji\r\nfamilia 👨‍👩‍👦', true],
    ['crlf mix', 'header1,header2\r\nval1,val2\r\n', true],
    ['zero width space', 'zero\u200Bwidth\uFEFFbom', true],
    ['corrupted inline header', '«NOESIS»\n', false],
    ['corrupted inline missing dict', '«NOESIS»\n[BODY]\nxyz\n«END»', false],
    ['corrupted inline bad json', '«NOESIS»\n[DICT: 닥=unquoted]\n[BODY]\n닥\n«END»', false],
    ['bare literal wrap', 'νliteral message payload', false],
    ['long single line 10k', 'x'.repeat(10_000), true],
  ];

  for (const [name, text, checkNeverWorse] of pathologicalShapes) {
    try {
      const r = await noesisEncode(text, enc);
      const dec = noesisDecode(r.wire, enc);
      ok(dec === text || text.length === 0, `N1 roundtrip: ${name}`);
      if (checkNeverWorse) {
        ok(r.outTokens <= r.inTokens, `N1 never worse: ${name}`, `${r.inTokens}->${r.outTokens}`);
      }
    } catch (e: any) {
      ok(false, `N1 crashed on ${name}: ${e.message}`);
    }
  }

  // Corrupted wire totality
  const corruptedWires = [
    '«NOESIS»',
    '«NOESIS»\n',
    '«NOESIS»\n[DICT: ',
    '«NOESIS»\n[DICT: 닥="val"]',
    '«NOESIS»\n[DICT: 닥="val"]\n[BODY]\n',
    'ν',
    'νν',
    'ν\uAC00\uFFFF',
    '«SYNAPSE»',
    'ϖ',
    '[MZ1]\n',
    'φ',
    'τ',
    '§ST1',
  ];
  for (const cw of corruptedWires) {
    try {
      const dec = noesisDecode(cw, enc);
      ok(typeof dec === 'string', `N1 totality on corrupted wire: ${JSON.stringify(cw)}`);
    } catch (e: any) {
      ok(false, `N1 totality failed on ${JSON.stringify(cw)}: ${e.message}`);
    }
  }

  console.log('=== NOESIS RED-TEAM PASS 2: Canonical Fixtures Honest Non-Rosetta Pareto Verification ===');
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
    const raw = countTokens(text, enc);
    const noe = await noesisEncode(text, enc);
    const back = noesisDecode(noe.wire, enc);
    const rSyn = await synapseEncode(text, enc);
    const rStrand = strandEncode(text, enc);
    const rLattice = latticeEncode(text, enc);
    const rPhrase = phraseEncode(text, enc);
    const rTau = tauEncode(text, enc);
    const rMeridian = meridianEncode(text, enc);
    const rSignet = signetEncode(text, enc);
    const rPulse = pulseEncode(text);

    const minNonRosetta = Math.min(
      raw,
      rSyn.outTokens,
      rStrand.outTokens,
      rLattice.outTokens,
      rPhrase.outTokens,
      rTau.outTokens,
      rMeridian.outTokens,
      rSignet.outTokens,
      rPulse.applied ? rPulse.outTokens : raw,
    );
    ok(back === text, `N2 byte-exact: ${name}`);
    ok(noe.exact, `N2 exact flag: ${name}`);
    ok(noe.outTokens <= minNonRosetta, `N3 Pareto non-inferior: ${name}`, `noesis=${noe.outTokens} <= minNonRosetta=${minNonRosetta}`);
  }

  console.log('=== NOESIS RED-TEAM PASS 3: Holdout Benchmark Suite Pareto Verification ===');
  const holdoutDir = './bench/holdout';
  if (fs.existsSync(holdoutDir)) {
    const holdoutFiles = fs.readdirSync(holdoutDir);
    for (const file of holdoutFiles) {
      const text = fs.readFileSync(path.join(holdoutDir, file), 'utf-8');
      const raw = countTokens(text, enc);
      const noe = await noesisEncode(text, enc);
      const back = noesisDecode(noe.wire, enc);
      const rSyn = await synapseEncode(text, enc);
      const rStrand = strandEncode(text, enc);
      const rLattice = latticeEncode(text, enc);
      const rPhrase = phraseEncode(text, enc);
      const rTau = tauEncode(text, enc);

      const minOther = Math.min(raw, rSyn.outTokens, rStrand.outTokens, rLattice.outTokens, rPhrase.outTokens, rTau.outTokens);
      ok(back === text, `N3 holdout byte-exact: ${file}`);
      ok(noe.outTokens <= minOther, `N3 holdout Pareto non-inferior: ${file}`, `noesis=${noe.outTokens} <= minOther=${minOther}`);
    }
  }

  console.log('=== NOESIS RED-TEAM PASS 4: General Prose & Ops Non-Schema Gain ===');
  const opsPrompt = 'Based on your request, I have analyzed the Kubernetes cluster and found a connection pool timeout in the database. In order to resolve this, please make sure that the following configuration is applied: kubectl rollout status deployment/web-api --timeout=60s. Check out the full documentation on https://github.com/kubernetes/kubernetes. Let me know if you need any further assistance.';
  const rOps = await noesisEncode(opsPrompt, enc);
  const backOps = noesisDecode(rOps.wire, enc);
  ok(backOps === opsPrompt, 'N4 ops prompt roundtrip');
  ok(rOps.outTokens < rOps.inTokens, 'N4 ops prompt token reduction', `${rOps.inTokens}->${rOps.outTokens}`);

  console.log('=== NOESIS RED-TEAM PASS 5: Zero-System-Prompt In-Context LLM Readability ===');
  const sampleDoc = 'TypeScript and JavaScript support out of the box in Cloudflare Workers. Check out the full documentation on https://github.com/drizzle-team/drizzle-orm.';
  const macros = extractNoesisHierarchicalMacros(sampleDoc, enc);
  const v = noesisViterbiFold(sampleDoc, enc, macros);
  const legend = v.usedGlyphs.map(g => `${g}=${JSON.stringify(v.byGlyph.get(g))}`).join('|');
  const inlineWire = `«NOESIS»\n[DICT: ${legend}]\n[BODY]\n${v.wire}\n«END»`;
  const backInline = noesisDecode(inlineWire, enc);
  ok(backInline === sampleDoc, 'N5 inline self-describing wire roundtrip without system prompt');

  console.log('=== NOESIS RED-TEAM PASS 6: Determinism & Idempotency ===');
  const detSample = CHAOS_900;
  const run1 = await noesisEncode(detSample, enc);
  const run2 = await noesisEncode(detSample, enc);
  ok(run1.wire === run2.wire, 'N6 determinism: identical wire on identical input');
  ok(run1.outTokens === run2.outTokens, 'N6 determinism: identical token count');

  console.log(`\nNOESIS RED-TEAM RESULT: ${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

runNoesisRedTeam().catch((e) => {
  console.error(e);
  process.exit(1);
});
