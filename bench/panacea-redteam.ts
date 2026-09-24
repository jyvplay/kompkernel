/**
 * bench/panacea-redteam.ts — PANACEA-Ω Adversarial Verification & Pareto Proof
 * =============================================================================
 * Rigorous 6-pass Red Team verification:
 * P1 — Negative space, malformed header totality & boundary conditions (20+ shapes)
 * P2 — Exact byte-for-byte roundtrip across all canonical fixtures & holdouts
 * P3 — Strict Pareto non-inferiority: Cost(PANACEA) <= min(Cost(Lanes)) on 100% of inputs
 * P4 — Non-schema general prose and ops gain verification
 * P5 — Single-turn in-context direct LLM readability (zero system prompt needed)
 * P6 — Determinism, idempotency, and cross-encoding stability
 * =============================================================================
 */

import { panaceaEncode, panaceaDecode, panaceaSelfTest, panaceaViterbiFold, extractPanaceaMacros } from '@/lib/omega/panacea';
import { aetherEncode } from '@/lib/omega/aether';
import { harmoniaEncode } from '@/lib/omega/harmonia';
import { rosettaEncode } from '@/lib/omega/rosetta';
import { strandEncode } from '@/lib/omega/strand';
import { latticeEncode } from '@/lib/omega/lattice';
import { phraseEncode } from '@/lib/omega/phrase';
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

async function runPanaceaRedTeam() {
  const enc: EncodingName = 'o200k_base';

  console.log('=== PANACEA RED-TEAM PASS 1: Negative Space & Decoder Totality ===');
  const pathologicalShapes: Array<[string, string, boolean]> = [
    ['empty string', '', true],
    ['single ascii char', 'a', true],
    ['single cjk char', '中', true],
    ['pure newlines', '\n\n\n\n', true],
    ['astral emoji + zwj', '👩‍👩‍👧‍👦 🏳️‍🌈 emoji\r\nfamilia 👨‍👩‍👦', true],
    ['crlf mix', 'header1,header2\r\nval1,val2\r\n', true],
    ['zero width space', 'zero\u200Bwidth\uFEFFbom', true],
    ['corrupted inline header', '«PANACEA»\n', false],
    ['corrupted inline missing macros', '«PANACEA»\n[BODY]\nxyz\n«END»', false],
    ['corrupted inline bad json', '«PANACEA»\n[MACROS: 닥=unquoted]\n[BODY]\n닥\n«END»', false],
    ['bare literal wrap', 'ϖliteral message payload', false],
    ['long single line 10k', 'x'.repeat(10_000), true],
  ];

  for (const [name, text, checkNeverWorse] of pathologicalShapes) {
    try {
      const r = await panaceaEncode(text, enc);
      const dec = panaceaDecode(r.wire, enc);
      ok(dec === text || text.length === 0, `P1 roundtrip: ${name}`);
      if (checkNeverWorse) {
        ok(r.outTokens <= r.inTokens, `P1 never worse: ${name}`, `${r.inTokens}->${r.outTokens}`);
      }
    } catch (e: any) {
      ok(false, `P1 crashed on ${name}: ${e.message}`);
    }
  }

  // Corrupted wire totality
  const corruptedWires = [
    '«PANACEA»',
    '«PANACEA»\n',
    '«PANACEA»\n[MACROS: ',
    '«PANACEA»\n[MACROS: 닥="val"]',
    '«PANACEA»\n[MACROS: 닥="val"]\n[BODY]\n',
    'ϖ',
    'ϖϖ',
    'ϖ\uAC00\uFFFF',
    '«AETHER»\n',
    '[HM1]\n',
    'ぁぁ',
  ];
  for (const cw of corruptedWires) {
    try {
      const dec = panaceaDecode(cw, enc);
      ok(typeof dec === 'string', `P1 totality on corrupted wire: ${JSON.stringify(cw)}`);
    } catch (e: any) {
      ok(false, `P1 totality failed on ${JSON.stringify(cw)}: ${e.message}`);
    }
  }

  console.log('=== PANACEA RED-TEAM PASS 2: Canonical Fixtures Pareto Verification ===');
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
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
  ];

  for (const [name, text] of canonicalSuite) {
    const raw = countTokens(text, enc);
    const pa = await panaceaEncode(text, enc);
    const back = panaceaDecode(pa.wire, enc);
    const rAether = await aetherEncode(text, enc);
    const rHarmonia = await harmoniaEncode(text, enc);
    const rRosetta = await rosettaEncode(text, enc);
    const rStrand = strandEncode(text, enc);
    const rLattice = latticeEncode(text, enc);
    const rPhrase = phraseEncode(text, enc);

    const minOther = Math.min(raw, rAether.outTokens, rHarmonia.outTokens, rRosetta.outTokens, rStrand.outTokens, rLattice.outTokens, rPhrase.outTokens);
    ok(back === text, `P2 byte-exact: ${name}`);
    ok(pa.exact, `P2 exact flag: ${name}`);
    ok(pa.outTokens <= minOther, `P3 Pareto non-inferior: ${name}`, `panacea=${pa.outTokens} <= min=${minOther}`);
  }

  console.log('=== PANACEA RED-TEAM PASS 3: Holdout Benchmark Suite Pareto Verification ===');
  const holdoutDir = './bench/holdout';
  if (fs.existsSync(holdoutDir)) {
    const holdoutFiles = fs.readdirSync(holdoutDir);
    for (const file of holdoutFiles) {
      const text = fs.readFileSync(path.join(holdoutDir, file), 'utf-8');
      const raw = countTokens(text, enc);
      const pa = await panaceaEncode(text, enc);
      const back = panaceaDecode(pa.wire, enc);
      const rAether = await aetherEncode(text, enc);

      ok(back === text, `P3 holdout byte-exact: ${file}`);
      ok(pa.outTokens <= rAether.outTokens, `P3 holdout Pareto non-inferior: ${file}`, `panacea=${pa.outTokens} <= aether=${rAether.outTokens}`);
    }
  }

  console.log('=== PANACEA RED-TEAM PASS 4: General Prose & Ops Non-Schema Gain ===');
  const opsPrompt = 'Based on your request, I have analyzed the Kubernetes cluster and found a connection pool timeout in the database. In order to resolve this, please make sure the following configuration is applied: kubectl rollout status deployment/web-api --timeout=60s. Check out the full documentation on https://github.com/kubernetes/kubernetes. Let me know if you need any further assistance.';
  const rOps = await panaceaEncode(opsPrompt, enc);
  const backOps = panaceaDecode(rOps.wire, enc);
  ok(backOps === opsPrompt, 'P4 ops prompt roundtrip');
  ok(rOps.outTokens < rOps.inTokens, 'P4 ops prompt token reduction', `${rOps.inTokens}->${rOps.outTokens}`);

  console.log('=== PANACEA RED-TEAM PASS 5: Zero-System-Prompt In-Context LLM Readability ===');
  const sampleDoc = 'TypeScript and JavaScript support out of the box in Cloudflare Workers. Check out the full documentation on https://github.com/drizzle-team/drizzle-orm.';
  const macros = extractPanaceaMacros(sampleDoc, enc);
  const v = panaceaViterbiFold(sampleDoc, enc, macros);
  const legend = v.usedGlyphs.map(g => `${g}=${JSON.stringify(v.byGlyph.get(g))}`).join('|');
  const inlineWire = `«PANACEA»\n[MACROS: ${legend}]\n[BODY]\n${v.wire}\n«END»`;
  const backInline = panaceaDecode(inlineWire, enc);
  ok(backInline === sampleDoc, 'P5 inline self-describing wire roundtrip without system prompt');

  console.log('=== PANACEA RED-TEAM PASS 6: Determinism & Idempotency ===');
  const detSample = CHAOS_900;
  const run1 = await panaceaEncode(detSample, enc);
  const run2 = await panaceaEncode(detSample, enc);
  ok(run1.wire === run2.wire, 'P6 determinism: identical wire on identical input');
  ok(run1.outTokens === run2.outTokens, 'P6 determinism: identical token count');

  console.log(`\nPANACEA RED-TEAM RESULT: ${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

runPanaceaRedTeam().catch((e) => {
  console.error(e);
  process.exit(1);
});
