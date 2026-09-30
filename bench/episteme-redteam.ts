/**
 * bench/episteme-redteam.ts
 * =============================================================================
 * EPISTEME-Ω RED TEAM VALIDATION SUITE
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { epistemeEncode, epistemeDecode, epistemeTransformTypography, epistemeRestoreTypography } from '../src/lib/omega/episteme';
import { EPISTEME_FIXTURES } from './episteme-fixtures';
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

console.log('Running EPISTEME-Ω Red Team Suite...\n');

/* ===========================================================================
 * G0 — Novelty Check
 * ========================================================================= */
{
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'episteme.ts' && f !== 'metatron.ts' && f !== 'registry.ts' && f !== 'codec-synthesis.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.includes('0xFB00') || src.includes('\\uFB00') || src.includes('\uFB00');
    });
  check('G0', hits.length === 0, `no prior lane implements Latin typographic ligature restoration (found: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — Round-Trip Verification Across All Fixtures
 * ========================================================================= */
const allFixtures: Record<string, string> = {
  ...EPISTEME_FIXTURES,
  CHAOS_900,
  CHAOS_G_CJK,
  CHAOS_F_LLM_REPORT,
  MOSAIC_HANDTRACE_300,
};

for (const [name, text] of Object.entries(allFixtures)) {
  const encRes = epistemeEncode(text, ENC);
  const dec = epistemeDecode(encRes.wire);
  check(`G1 [${name}]`, dec === text, `exact byte-for-byte round trip (exact=${encRes.exact})`);
  check(`G4 [${name}]`, encRes.outTokens <= encRes.inTokens, `economic non-regression (in=${encRes.inTokens}, out=${encRes.outTokens})`);
}

/* ===========================================================================
 * G2 — Independent CPython 3 Decoder Verification (on typography fixtures)
 * ========================================================================= */
for (const [name, text] of Object.entries(EPISTEME_FIXTURES)) {
  const encRes = epistemeEncode(text, ENC);
  if (encRes.winner === 'typography-prepass' || encRes.winner === 'inline-operad-lattice') {
    const py = spawnSync('python3', [path.join(__dirname, 'episteme_decode.py')], {
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
  const negProse = EPISTEME_FIXTURES.pureEnglishProseNegative;
  const negCode = EPISTEME_FIXTURES.pureAsciiCodeNegative;

  const resProse = epistemeEncode(negProse, ENC);
  const resCode = epistemeEncode(negCode, ENC);

  check('G3 [prose]', resProse.exact && resProse.outTokens <= resProse.inTokens, 'pure English prose safely encoded without expansion');
  check('G3 [code]', resCode.exact && resCode.outTokens <= resCode.inTokens, 'pure ASCII code safely encoded without expansion');
}

/* ===========================================================================
 * G8 — Headline Receipts Verification
 * ========================================================================= */
{
  const paper = EPISTEME_FIXTURES.academicPaperLigatures;
  const rawTok = T(paper);
  const res = epistemeEncode(paper, ENC);
  const saved = rawTok - res.outTokens;
  const pct = (saved / rawTok) * 100;

  console.log(`Headline Receipt (academicPaperLigatures): raw=${rawTok}, episteme=${res.outTokens}, saved=${saved} (${pct.toFixed(1)}%)`);
  check('G8 [academicPaperLigatures]', saved >= 40, `saved significant tokens on academic paper with ligatures (saved=${saved})`);
}

/* ===========================================================================
 * G9 — Adversarial Fuzzing (200 random mutations)
 * ========================================================================= */
{
  let fuzzPassed = 0;
  for (let i = 0; i < 200; i++) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 \n\t\uFB00\uFB01\uFB02\uFB03\uFB04\u2160\u2161\u2162\u2163';
    let randStr = '';
    const len = 20 + Math.floor(Math.random() * 80);
    for (let j = 0; j < len; j++) {
      randStr += chars[Math.floor(Math.random() * chars.length)];
    }

    const encRes = epistemeEncode(randStr, ENC);
    const dec = epistemeDecode(encRes.wire);
    if (dec === randStr && encRes.outTokens <= encRes.inTokens) {
      fuzzPassed++;
    }
  }
  check('G9 [fuzz]', fuzzPassed === 200, `200/200 adversarial fuzz tests passed (passed=${fuzzPassed})`);
}

console.log(`\nEPISTEME RED TEAM: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
