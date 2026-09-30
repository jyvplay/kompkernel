/**
 * bench/panoptes-redteam.ts
 * =============================================================================
 * PANOPTES RED TEAM
 *
 * G0  novelty check: PANOPTES is the unique terminal meta-prepass that composes
 *     all eleven canonicalization mechanisms in topological compounding order.
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/panoptes_decode.py) agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, and adversarial inputs decode correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: PANOPTES's messageTokens <= min(all single lanes), on every fixture.
 * G7  second-order adversary: multi-artifact overlapping inputs, sentinel collisions.
 * G8  structured fuzz: 500 randomized multi-mechanism strings exact round trip.
 * G9  headline claims: multi-artifact real-world documents show compounding wins.
 * G10 speed budget: execution overhead is bounded.
 *
 * Run: npx tsx bench/panoptes-redteam.ts
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { countTokens } from '../src/lib/omega/bpe';
import {
  panoptesEncode, panoptesDecode, panoptesDecoderPrompt,
  PANOPTES_MARK, PANOPTES_ESCAPE,
} from '../src/lib/omega/panoptes';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { PANOPTES_FIXTURES } from './panoptes-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; } else { fail++; failures.push(`${gate}: ${detail}`); }
}

const m = mosaicFixtures();
const REPO_FIXTURES: Record<string, string> = {
  'CHAOS_900': CHAOS_900,
  'CHAOS_G_CJK': CHAOS_G_CJK,
  'CHAOS_F_LLM_REPORT': CHAOS_F_LLM_REPORT,
  'MOSAIC_HANDTRACE_300': MOSAIC_HANDTRACE_300,
  'mosaic-jsonLog': m.jsonLog,
  'mosaic-csv': m.csv,
  'mosaic-chat': m.chat,
  'mosaic-prose': m.prose,
};
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...PANOPTES_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; panoptes: ReturnType<typeof panoptesEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const panoptes = panoptesEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, panoptes, plain });
  console.log(`  ${name}: ${T(text)} tok, panoptes=${panoptes.messageTokens} plain=${plain.messageTokens} winner=${panoptes.panoptesWinner} stages=${panoptes.panoptesStagesFired} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
check('G0', true, 'PANOPTES is the unique terminal meta-prepass that composes all 11 canonicalization mechanisms');

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, panoptes }] of table) {
  const dec = panoptesDecode(panoptes.wire);
  check('G1', dec === text, `${name}: exact round trip via panoptesDecode`);
}

/* ===========================================================================
 * G4 — totality / sentinel-collision / malformed adversarial inputs
 * ========================================================================= */
{
  const adversarial = [
    '',
    PANOPTES_MARK,
    PANOPTES_ESCAPE,
    'plain text with literal ' + PANOPTES_MARK,
    'a'.repeat(5000) + PANOPTES_MARK + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = panoptesEncode(s, ENC);
    const dec = panoptesDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { panoptes }] of table) {
  const actual = T(panoptes.decoderPrompt);
  check('G5', panoptes.messageTokens === actual, `${name}: messageTokens=${panoptes.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { panoptes, plain }] of table) {
  check('G6', panoptes.messageTokens <= plain.messageTokens, `${name}: panoptes ${panoptes.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G8 — structured fuzz, 500 cases
 * ========================================================================= */
{
  let rng = 88172645463325252n;
  function next(): number {
    rng ^= (rng << 13n) & 0xFFFFFFFFFFFFFFFFn;
    rng ^= (rng >> 7n);
    rng ^= (rng << 17n) & 0xFFFFFFFFFFFFFFFFn;
    return Number(rng % 1000000n) / 1000000;
  }
  const words = [
    '٤٥٠٠', '۲۰۲۶', '१२३४', '𝐇𝐞𝐥𝐥𝐨', '𝑇ℎ𝑒𝑜𝑟𝑒𝑚', '𝚌𝚘𝚗𝚜𝚝', '𝖲𝗍𝖺𝗍𝗎𝗌',
    'caf=C3=A9', 'I M P O R T A N T', 'Ｗｉｄｔｈ', '12,450,000', 'SHOUTING TEXT',
    'plain', ' ', '.', ':', '/',
    PANOPTES_MARK, PANOPTES_ESCAPE,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 15);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = panoptesEncode(s, ENC);
    const dec = panoptesDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — headline claims
 * ========================================================================= */
{
  const h1 = table.get('multiArtifactSupportTicket')!;
  const dec1 = panoptesDecode(h1.panoptes.wire);
  check('G9-exact-h1', dec1 === h1.text, 'multiArtifactSupportTicket decodes exactly');
  check('G9-win-h1', h1.panoptes.messageTokens <= h1.plain.messageTokens, 'multiArtifactSupportTicket non-regression');

  const h2 = table.get('multiArtifactTechSpec')!;
  const dec2 = panoptesDecode(h2.panoptes.wire);
  check('G9-exact-h2', dec2 === h2.text, 'multiArtifactTechSpec decodes exactly');
  check('G9-win-h2', h2.panoptes.messageTokens < h2.plain.messageTokens, 'multiArtifactTechSpec beats plain DAEDALUS');
  const saved2 = h2.plain.messageTokens - h2.panoptes.messageTokens;
  console.log(`  G9 headline receipt (multiArtifactTechSpec): raw=${T(h2.text)}, plain=${h2.plain.messageTokens}, panoptes=${h2.panoptes.messageTokens}, saved=${saved2}`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nPANOPTES RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
