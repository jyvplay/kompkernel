/**
 * bench/metatron-redteam.ts
 * =============================================================================
 * METATRON-Ω RED TEAM VALIDATION SUITE
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode, metatronDecode, metatronTransformStructure, metatronRestoreStructure } from '../src/lib/omega/metatron';
import { METATRON_FIXTURES } from './metatron-fixtures';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300 } from './fixtures';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(gate: string, condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${gate}: ${message}`);
    console.error(`  [FAIL] ${gate}: ${message}`);
  }
}

console.log('Running METATRON-Ω Red Team Suite...\n');

/* ===========================================================================
 * G0 — Novelty Check
 * ========================================================================= */
{
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'metatron.ts' && f !== 'registry.ts' && f !== 'codec-synthesis.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.includes('STRUCTURAL_RULES') || src.includes('metatronTransformStructure');
    });
  check('G0', hits.length === 0, `no prior lane implements markdown structural checklist pre-pass (found: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — Round-Trip Verification Across All Fixtures
 * ========================================================================= */
const allFixtures: Record<string, string> = {
  ...METATRON_FIXTURES,
  CHAOS_900,
  CHAOS_G_CJK,
  CHAOS_F_LLM_REPORT,
  MOSAIC_HANDTRACE_300,
};

for (const [name, text] of Object.entries(allFixtures)) {
  const encRes = metatronEncode(text, ENC);
  const dec = metatronDecode(encRes.wire);
  check(`G1 [${name}]`, dec === text, `exact byte-for-byte round trip (exact=${encRes.exact})`);
  check(`G4 [${name}]`, encRes.outTokens <= encRes.inTokens, `economic non-regression (in=${encRes.inTokens}, out=${encRes.outTokens})`);
}

/* ===========================================================================
 * G2 — Independent CPython 3 Decoder Verification
 * ========================================================================= */
for (const [name, text] of Object.entries(METATRON_FIXTURES)) {
  const encRes = metatronEncode(text, ENC);
  if (encRes.winner === 'markdown-structure' || encRes.winner === 'typography-prepass' || encRes.winner === 'structure-typography-composed') {
    const py = spawnSync('python3', [path.join(__dirname, 'metatron_decode.py')], {
      input: encRes.wire,
      encoding: 'utf8',
    });
    check(`G2 [${name}]`, py.stdout === text, `independent CPython 3 decoder matches exactly`);
  }
}

/* ===========================================================================
 * G3 — Negative Space Invariance
 * ========================================================================= */
{
  const negProse = METATRON_FIXTURES.pureEnglishProseNegative;
  const negCode = METATRON_FIXTURES.pureAsciiCodeNegative;

  const resProse = metatronEncode(negProse, ENC);
  const resCode = metatronEncode(negCode, ENC);

  check('G3 [prose]', resProse.exact && resProse.outTokens <= resProse.inTokens, 'pure English prose safely encoded without expansion');
  check('G3 [code]', resCode.exact && resCode.outTokens <= resCode.inTokens, 'pure ASCII code safely encoded without expansion');
}

/* ===========================================================================
 * G8 — Headline Receipts Verification
 * ========================================================================= */
{
  const doc = METATRON_FIXTURES.markdownArchitectureDoc;
  const rawTok = T(doc);
  const res = metatronEncode(doc, ENC);
  const saved = rawTok - res.outTokens;
  const pct = (saved / rawTok) * 100;

  console.log(`Headline Receipt (markdownArchitectureDoc): raw=${rawTok}, metatron=${res.outTokens}, saved=${saved} (${pct.toFixed(1)}%)`);
  check('G8 [markdownArchitectureDoc]', saved >= 15, `saved significant tokens on markdown architecture doc (saved=${saved})`);
}

/* ===========================================================================
 * G9 — Adversarial Fuzzing (200 random mutations)
 * ========================================================================= */
{
  let fuzzPassed = 0;
  for (let i = 0; i < 200; i++) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 \n\t-[]x#|:```';
    let randStr = '';
    const len = 20 + Math.floor(Math.random() * 80);
    for (let j = 0; j < len; j++) {
      randStr += chars[Math.floor(Math.random() * chars.length)];
    }

    const encRes = metatronEncode(randStr, ENC);
    const dec = metatronDecode(encRes.wire);
    if (dec === randStr && encRes.outTokens <= encRes.inTokens) {
      fuzzPassed++;
    }
  }
  check('G9 [fuzz]', fuzzPassed === 200, `200/200 adversarial fuzz tests passed (passed=${fuzzPassed})`);
}

console.log(`\nMETATRON RED TEAM: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
