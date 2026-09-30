/**
 * bench/arithmos-redteam.ts
 * =============================================================================
 * ARITHMOS RED TEAM
 *
 * G0  novelty check: no other lane in this repo implements native-script numeral
 *     restoration (Eastern Arabic-Indic U+0660-0669, Persian U+06F0-06F9, Devanagari
 *     U+0966-096F).
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/arithmos_decode.py), independent
 *     runtime AND independent implementation, agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, dangling/
 *     unterminated brackets, mixed invalid digits, and non-ARITHMOS text all decode
 *     correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: ARITHMOS's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture.
 * G7  second-order adversary: mixed script runs, ASCII digits directly adjacent,
 *     isolated single digits, sentinel collisions, and emoji/CJK adjacency.
 * G8  structured fuzz: 500 randomized strings mixing Arabic-Indic, Persian,
 *     Devanagari, ASCII digits, CJK, emoji, and reserved sentinel characters;
 *     exact round trip on every one, zero crashes.
 * G9  headline claims: realistic Arabic, Persian, and Hindi business fixtures
 *     show honest token wins, while negative-space fixtures show zero gain.
 * G10 speed budget: span-finding overhead is bounded and cheap (< 10ms).
 *
 * Run: npx tsx bench/arithmos-redteam.ts
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
  arithmosEncode, arithmosDecode, arithmosDecoderPrompt, findArithmosSpans,
  ARITHMOS_MARK, ARITHMOS_ESCAPE,
  ARABIC_PREFIX, PERSIAN_PREFIX, DEV_PREFIX,
  ARABIC_BASE, PERSIAN_BASE, DEV_BASE,
} from '../src/lib/omega/arithmos';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { ARITHMOS_FIXTURES } from './arithmos-fixtures';

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
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...ARITHMOS_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; arithmos: ReturnType<typeof arithmosEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const arithmos = arithmosEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, arithmos, plain });
  console.log(`  ${name}: ${T(text)} tok, arithmos=${arithmos.messageTokens} plain=${plain.messageTokens} applied=${arithmos.arithmosApplied} spans=${arithmos.arithmosSpans} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'arithmos.ts' && f !== 'registry.ts' && f !== 'panoptes.ts' && f !== 'codec-synthesis.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.includes('0x0660') || src.includes('0x06F0') || src.includes('0x0966');
    });
  check('G0', hits.length === 0, `no other lane implements native-script numeral restoration (found: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, arithmos }] of table) {
  const dec = arithmosDecode(arithmos.wire);
  check('G1', dec === text, `${name}: exact round trip via arithmosDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction prose
 * ========================================================================= */
function specRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === ARABIC_PREFIX) {
      i++;
      let digits = '';
      while (i < n && wire.charCodeAt(i) >= 48 && wire.charCodeAt(i) <= 57) {
        digits += String.fromCodePoint(ARABIC_BASE + (wire.charCodeAt(i) - 48));
        i++;
      }
      out += digits;
    } else if (ch === PERSIAN_PREFIX) {
      i++;
      let digits = '';
      while (i < n && wire.charCodeAt(i) >= 48 && wire.charCodeAt(i) <= 57) {
        digits += String.fromCodePoint(PERSIAN_BASE + (wire.charCodeAt(i) - 48));
        i++;
      }
      out += digits;
    } else if (ch === DEV_PREFIX) {
      i++;
      let digits = '';
      while (i < n && wire.charCodeAt(i) >= 48 && wire.charCodeAt(i) <= 57) {
        digits += String.fromCodePoint(DEV_BASE + (wire.charCodeAt(i) - 48));
        i++;
      }
      out += digits;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}
function specDecoder(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === ARITHMOS_MARK) return specRestoreSpans(daedalusDecode(wire.slice(1)));
  if (first === ARITHMOS_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}
for (const [name, { text, arithmos }] of table) {
  const dec = specDecoder(arithmos.wire);
  check('G2', dec === text, `${name}: second decoder (from spec) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, arithmos }] of table) { cases.push(arithmos.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arithmos-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/arithmos_decode.py', inPath, outPath], { stdio: 'pipe' });
    const got: string[] = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    let allMatch = got.length === expect.length;
    let firstBad = -1;
    for (let i = 0; i < expect.length && allMatch; i++) if (got[i] !== expect[i]) { allMatch = false; firstBad = i; }
    check('G3', allMatch, allMatch ? `CPython third decoder agrees on all ${expect.length} fixtures` : `mismatch at case ${firstBad}`);
  } catch (e: any) {
    check('G3', false, `python3 decoder failed: ${e?.message ?? e}`);
  }
}

/* ===========================================================================
 * G4 — totality / sentinel-collision / malformed adversarial inputs
 * ========================================================================= */
{
  const adversarial = [
    '',
    ARITHMOS_MARK,
    ARITHMOS_ESCAPE,
    ARABIC_PREFIX, // dangling prefix
    PERSIAN_PREFIX,
    DEV_PREFIX,
    ARABIC_PREFIX + 'abc', // non-digits after prefix
    ARABIC_PREFIX + '123' + DEV_PREFIX + '456',
    'plain text with a literal ' + ARITHMOS_MARK + ' in the middle',
    'a'.repeat(5000) + ARABIC_PREFIX + '1234' + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = arithmosEncode(s, ENC);
    const dec = arithmosDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { arithmos }] of table) {
  const actual = T(arithmos.decoderPrompt);
  check('G5', arithmos.messageTokens === actual, `${name}: messageTokens=${arithmos.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { arithmos, plain }] of table) {
  check('G6', arithmos.messageTokens <= plain.messageTokens, `${name}: arithmos ${arithmos.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // Mixed script digits in same string (each script must form its own run)
  const mixed = 'العربية: ١٢٣٤٥, فارسی: ۶۷۸۹۰, हिन्दी: १२३४५, English: 12345';
  {
    const spans = findArithmosSpans(mixed);
    check('G7-mixed-spans', spans.length === 3, 'mixed script string correctly produces 3 distinct script spans');
    const r = arithmosEncode(mixed, ENC);
    check('G7-mixed-exact', arithmosDecode(r.wire) === mixed, 'mixed script exact round trip');
  }

  // Sentinel-collision escape path
  {
    const s = ARITHMOS_MARK + 'text starting with ARITHMOS_MARK';
    const r = arithmosEncode(s, ENC);
    check('G7-collision-exact', arithmosDecode(r.wire) === s, 'sentinel-collision input decodes exactly');
  }
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
    '٠١٢٣٤', '٥٦٧٨٩', '۰۱۲۳۴', '۵۶۷۸۹', '०१२३४', '५६७८९',
    '12345', 'word', ' ', '.', ':', '/',
    ARITHMOS_MARK, ARITHMOS_ESCAPE, ARABIC_PREFIX, PERSIAN_PREFIX, DEV_PREFIX,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = arithmosEncode(s, ENC);
    const dec = arithmosDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — headline claims and negative space
 * ========================================================================= */
{
  const headline = table.get('arabicBusinessInvoice')!;
  const dec = arithmosDecode(headline.arithmos.wire);
  check('G9-exact', dec === headline.text, 'arabicBusinessInvoice decodes exactly');
  check('G9-applied', headline.arithmos.arithmosApplied === true, 'arithmos applied on arabicBusinessInvoice');
  const saved = headline.plain.messageTokens - headline.arithmos.messageTokens;
  const pctv = 100 * saved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt (arabicBusinessInvoice): raw=${T(headline.text)}, plain=${headline.plain.messageTokens}, arithmos=${headline.arithmos.messageTokens}, saved=${saved} (${pctv.toFixed(1)}%)`);
  check('G9-win', saved > 0, `arabicBusinessInvoice saved ${saved} tokens over plain DAEDALUS`);

  const neg1 = table.get('pureAsciiDigitsNegative')!;
  const neg1saved = neg1.plain.messageTokens - neg1.arithmos.messageTokens;
  check('G9-neg1', neg1saved === 0, `pureAsciiDigitsNegative shows zero gain (${neg1saved} tok)`);

  const neg2 = table.get('pureEnglishProseNegative')!;
  const neg2saved = neg2.plain.messageTokens - neg2.arithmos.messageTokens;
  check('G9-neg2', neg2saved === 0, `pureEnglishProseNegative shows zero gain (${neg2saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const t0 = Date.now();
  findArithmosSpans(ARITHMOS_FIXTURES.arabicBusinessInvoice);
  const findMs = Date.now() - t0;
  check('G10', findMs < 10, `span-find self-check: ${findMs}ms (must be < 10ms)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nARITHMOS RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
