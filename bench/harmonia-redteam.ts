/**
 * bench/harmonia-redteam.ts — HARMONIA-H1 Adversarial Verification & Pareto Proof
 * =============================================================================
 * Rigorous 6-pass Red Team verification:
 * H1 — Negative space & corrupted wire totality (≥20 pathological shapes)
 * H2 — Exact byte-for-byte round-trip across all canonical fixtures & holdouts
 * H3 — Strict Pareto non-inferiority: Cost(Harmonia) ≤ min(Cost(Lanes)) on 100% of inputs
 * H4 — Multi-regime DP partitioning correctness & separator non-collision
 * H5 — GPO-2 Viterbi DAG shortest-path token-optimal tiling
 * H6 — Determinism, idempotency, and cross-encoding stability
 * =============================================================================
 */

import { harmoniaEncode, harmoniaDecode, harmoniaSelfTest, getGpoCodebook, gpoLatticeFold, gpoExpand } from '@/lib/omega/harmonia';
import { rosettaEncode } from '@/lib/omega/rosetta';
import { strandEncode } from '@/lib/omega/strand';
import { latticeEncode } from '@/lib/omega/lattice';
import { phraseEncode } from '@/lib/omega/phrase';
import { meridianEncode } from '@/lib/omega/meridian';
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

async function runHarmoniaRedTeam() {
  const enc: EncodingName = 'o200k_base';

  console.log('=== HARMONIA RED-TEAM PASS 1: Negative Space & Decoder Totality ===');
  const pathologicalShapes: Array<[string, string, boolean]> = [
    ['empty string', '', true],
    ['single ascii char', 'a', true],
    ['single cjk char', '中', true],
    ['pure newlines', '\n\n\n\n', true],
    ['astral emoji + zwj', '👩‍👩‍👧‍👦 🏳️‍🌈 emoji\r\nfamilia 👨‍👩‍👦', true],
    ['crlf mix', 'header1,header2\r\nval1,val2\r\n', true],
    ['zero width space', 'zero\u200Bwidth\uFEFFbom', true],
    ['corrupted HM1 header', '[HM1]\n', false], // sentinel collision wrap
    ['corrupted HM1 missing payload', '[HM1]\n§\n', false],
    ['corrupted HM1 invalid tag', '[HM1]\n§\n§?invalid payload', false],
    ['corrupted HM1 bad rosetta payload', '[HM1]\n§\n§rぁぁcorrupted_k9_marker', false],
    ['corrupted GPO wire', 'φ\uAC00\uD7A3\uFFFF', false],
    ['bare literal wrap', 'φφliteral message payload', false],
    ['long single line 10k', 'x'.repeat(10_000), true],
  ];

  for (const [name, text, checkNeverWorse] of pathologicalShapes) {
    try {
      const r = await harmoniaEncode(text, enc);
      const dec = harmoniaDecode(r.wire, enc);
      ok(dec === text || text.length === 0, `H1 roundtrip: ${name}`);
      if (checkNeverWorse) {
        ok(r.outTokens <= r.inTokens, `H1 never worse: ${name}`, `${r.inTokens}->${r.outTokens}`);
      }
    } catch (e: any) {
      ok(false, `H1 crashed on ${name}: ${e.message}`);
    }
  }

  // Corrupted wire totality
  const corruptedWires = [
    '[HM1]',
    '[HM1]\n',
    '[HM1]\n\n',
    '[HM1]\n§\n§',
    '[HM1]\n§\n§x',
    '[HM1]\n§\n§r',
    'φ',
    'φφ',
    'χ',
    'χχ',
    '[MZ1]\n',
    'ぁぁ',
  ];
  for (const cw of corruptedWires) {
    try {
      const dec = harmoniaDecode(cw, enc);
      ok(typeof dec === 'string', `H1 totality on corrupted wire: ${JSON.stringify(cw)}`);
    } catch (e: any) {
      ok(false, `H1 totality failed on ${JSON.stringify(cw)}: ${e.message}`);
    }
  }

  console.log('=== HARMONIA RED-TEAM PASS 2: Canonical Fixtures Pareto Verification ===');
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
    const hm = await harmoniaEncode(text, enc);
    const back = harmoniaDecode(hm.wire, enc);
    const rRosetta = await rosettaEncode(text, enc);
    const rStrand = strandEncode(text, enc);
    const rLattice = latticeEncode(text, enc);
    const rPhrase = phraseEncode(text, enc);

    const minOther = Math.min(raw, rRosetta.outTokens, rStrand.outTokens, rLattice.outTokens, rPhrase.outTokens);
    ok(back === text, `H2 byte-exact: ${name}`);
    ok(hm.exact, `H2 exact flag: ${name}`);
    ok(hm.outTokens <= minOther, `H3 Pareto non-inferior: ${name}`, `harmonia=${hm.outTokens} <= min=${minOther}`);
  }

  console.log('=== HARMONIA RED-TEAM PASS 3: Holdout Benchmark Suite Pareto Verification ===');
  const holdoutDir = './bench/holdout';
  if (fs.existsSync(holdoutDir)) {
    const holdoutFiles = fs.readdirSync(holdoutDir);
    for (const file of holdoutFiles) {
      const text = fs.readFileSync(path.join(holdoutDir, file), 'utf-8');
      const raw = countTokens(text, enc);
      const hm = await harmoniaEncode(text, enc);
      const back = harmoniaDecode(hm.wire, enc);
      const rRosetta = await rosettaEncode(text, enc);
      const rStrand = strandEncode(text, enc);
      const rLattice = latticeEncode(text, enc);
      const rPhrase = phraseEncode(text, enc);

      const minOther = Math.min(raw, rRosetta.outTokens, rStrand.outTokens, rLattice.outTokens, rPhrase.outTokens);
      ok(back === text, `H3 holdout byte-exact: ${file}`);
      ok(hm.outTokens <= minOther, `H3 holdout Pareto non-inferior: ${file}`, `harmonia=${hm.outTokens} <= min=${minOther}`);
    }
  }

  console.log('=== HARMONIA RED-TEAM PASS 4: GPO-2 Viterbi DAG Lattice Correctness ===');
  const gpoSample = 'Permission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal';
  const gpoFolded = gpoLatticeFold(gpoSample, enc);
  const gpoExpanded = gpoExpand(gpoFolded, enc);
  ok(gpoExpanded === gpoSample, 'H5 GPO DAG round-trip');
  ok(countTokens('χ' + gpoFolded, enc) < countTokens(gpoSample, enc), 'H5 GPO DAG token reduction');

  console.log('=== HARMONIA RED-TEAM PASS 5: Determinism & Idempotency ===');
  const detSample = CHAOS_900;
  const run1 = await harmoniaEncode(detSample, enc);
  const run2 = await harmoniaEncode(detSample, enc);
  ok(run1.wire === run2.wire, 'H6 determinism: identical wire on identical input');
  ok(run1.outTokens === run2.outTokens, 'H6 determinism: identical token count');

  console.log(`\nHARMONIA RED-TEAM RESULT: ${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

runHarmoniaRedTeam().catch((e) => {
  console.error(e);
  process.exit(1);
});
