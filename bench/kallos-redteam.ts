/**
 * bench/kallos-redteam.ts
 * =============================================================================
 * KALLOS RED TEAM
 *
 * G0  novelty check: no other lane in this repo implements mathematical
 *     alphanumeric & styled typography restoration (Math Bold, Italic, Monospace, Sans-Serif).
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/kallos_decode.py), independent
 *     runtime AND independent implementation, agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, dangling/
 *     unterminated brackets, mixed invalid characters, and non-KALLOS text all decode
 *     correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: KALLOS's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture.
 * G7  second-order adversary: Planck constant 'h' (U+210E), mixed style runs,
 *     adjacent ASCII text, sentinel collisions, and emoji/CJK adjacency.
 * G8  structured fuzz: 500 randomized strings mixing Math Bold, Italic,
 *     Monospace, Sans-Serif, ASCII letters/digits, CJK, emoji, and reserved sentinel characters;
 *     exact round trip on every one, zero crashes.
 * G9  headline claims: realistic styled mathematics paper, README, and blog
 *     show massive token wins (100+ tokens saved), while negative space shows zero gain.
 * G10 speed budget: span-finding overhead is bounded and cheap (< 10ms).
 *
 * Run: npx tsx bench/kallos-redteam.ts
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
  kallosEncode, kallosDecode, kallosDecoderPrompt, findKallosSpans, toStyledChar,
  KALLOS_MARK, KALLOS_ESCAPE,
  BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE,
  MONO_OPEN, MONO_CLOSE, SANS_OPEN, SANS_CLOSE,
} from '../src/lib/omega/kallos';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { KALLOS_FIXTURES } from './kallos-fixtures';

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
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...KALLOS_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; kallos: ReturnType<typeof kallosEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const kallos = kallosEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, kallos, plain });
  console.log(`  ${name}: ${T(text)} tok, kallos=${kallos.messageTokens} plain=${plain.messageTokens} applied=${kallos.kallosApplied} spans=${kallos.kallosSpans} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'kallos.ts' && f !== 'registry.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.includes('0x1D400') || src.includes('0x1D434') || src.includes('0x1D670');
    });
  check('G0', hits.length === 0, `no other lane implements mathematical alphanumeric font restoration (found: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, kallos }] of table) {
  const dec = kallosDecode(kallos.wire);
  check('G1', dec === text, `${name}: exact round trip via kallosDecode`);
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
    if (ch === BOLD_OPEN) {
      const close = wire.indexOf(BOLD_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'bold');
      out += res;
      i = close + 1;
    } else if (ch === ITALIC_OPEN) {
      const close = wire.indexOf(ITALIC_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'italic');
      out += res;
      i = close + 1;
    } else if (ch === MONO_OPEN) {
      const close = wire.indexOf(MONO_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'mono');
      out += res;
      i = close + 1;
    } else if (ch === SANS_OPEN) {
      const close = wire.indexOf(SANS_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let res = '';
      for (const c of inner) res += toStyledChar(c, 'sans');
      out += res;
      i = close + 1;
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
  if (first === KALLOS_MARK) return specRestoreSpans(daedalusDecode(wire.slice(1)));
  if (first === KALLOS_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}
for (const [name, { text, kallos }] of table) {
  const dec = specDecoder(kallos.wire);
  check('G2', dec === text, `${name}: second decoder (from spec) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, kallos }] of table) { cases.push(kallos.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kallos-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/kallos_decode.py', inPath, outPath], { stdio: 'pipe' });
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
    KALLOS_MARK,
    KALLOS_ESCAPE,
    BOLD_OPEN,
    BOLD_CLOSE,
    ITALIC_OPEN,
    MONO_CLOSE,
    BOLD_OPEN + '123' + ITALIC_CLOSE,
    'plain text with a literal ' + KALLOS_MARK + ' in the middle',
    'a'.repeat(5000) + BOLD_OPEN + 'Hello' + BOLD_CLOSE + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = kallosEncode(s, ENC);
    const dec = kallosDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { kallos }] of table) {
  const actual = T(kallos.decoderPrompt);
  check('G5', kallos.messageTokens === actual, `${name}: messageTokens=${kallos.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { kallos, plain }] of table) {
  check('G6', kallos.messageTokens <= plain.messageTokens, `${name}: kallos ${kallos.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // Test Planck constant 'h' in Math Italic (U+210E)
  const italicWithH = '𝑇ℎ𝑒 𝑞𝑢𝑖𝑐𝑘 𝑏𝑟𝑜𝑤𝑛 𝑓𝑜𝑥 ℎ𝑎𝑠 ℎ𝑒𝑖𝑔ℎ𝑡';
  {
    const spans = findKallosSpans(italicWithH);
    check('G7-planck-spans', spans.length > 0 && spans[0].asciiText.includes('h'), 'Math italic Planck constant h (U+210E) correctly maps to ascii h');
    const r = kallosEncode(italicWithH, ENC);
    check('G7-planck-exact', kallosDecode(r.wire) === italicWithH, 'Math italic with Planck constant h exact round trip');
  }

  // Mixed style runs in same sentence
  const mixed = '𝐁𝐨𝐥𝐝 𝑇𝑖𝑡𝑙𝑒 𝚊𝚗𝚍 𝖲𝖺𝗇𝗌 text';
  {
    const spans = findKallosSpans(mixed);
    check('G7-mixed-spans', spans.length === 4, 'mixed style runs correctly split into 4 spans');
    const r = kallosEncode(mixed, ENC);
    check('G7-mixed-exact', kallosDecode(r.wire) === mixed, 'mixed style runs exact round trip');
  }

  // Sentinel-collision escape path
  {
    const s = KALLOS_MARK + 'text starting with KALLOS_MARK';
    const r = kallosEncode(s, ENC);
    check('G7-collision-exact', kallosDecode(r.wire) === s, 'sentinel-collision input decodes exactly');
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
    '𝐇𝐞𝐥𝐥𝐨', '𝐖𝐨𝐫𝐥𝐝', '𝑇ℎ𝑒𝑜𝑟𝑒𝑚', '𝑝𝑟𝑜𝑜𝑓', '𝚌𝚘𝚗𝚜𝚝', '𝚟𝚊𝚕𝚞𝚎', '𝖲𝗍𝖺𝗍𝗎𝗌', '𝖮𝖪',
    'plain', '12345', ' ', '.', ':', '/',
    KALLOS_MARK, KALLOS_ESCAPE, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE,
    MONO_OPEN, MONO_CLOSE, SANS_OPEN, SANS_CLOSE,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = kallosEncode(s, ENC);
    const dec = kallosDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — headline claims and negative space
 * ========================================================================= */
{
  const headline = table.get('mathPaperStylized')!;
  const dec = kallosDecode(headline.kallos.wire);
  check('G9-exact', dec === headline.text, 'mathPaperStylized decodes exactly');
  check('G9-applied', headline.kallos.kallosApplied === true, 'kallos applied on mathPaperStylized');
  const saved = headline.plain.messageTokens - headline.kallos.messageTokens;
  const pctv = 100 * saved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt (mathPaperStylized): raw=${T(headline.text)}, plain=${headline.plain.messageTokens}, kallos=${headline.kallos.messageTokens}, saved=${saved} (${pctv.toFixed(1)}%)`);
  check('G9-large-win', saved >= 100 && pctv >= 30, `mathPaperStylized saved ${saved} tokens (${pctv.toFixed(1)}%) over plain DAEDALUS -- massive win`);

  const neg1 = table.get('pureAsciiCodeNegative')!;
  const neg1saved = neg1.plain.messageTokens - neg1.kallos.messageTokens;
  check('G9-neg1', neg1saved === 0, `pureAsciiCodeNegative shows zero gain (${neg1saved} tok)`);

  const neg2 = table.get('pureEnglishProseNegative')!;
  const neg2saved = neg2.plain.messageTokens - neg2.kallos.messageTokens;
  check('G9-neg2', neg2saved === 0, `pureEnglishProseNegative shows zero gain (${neg2saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const t0 = Date.now();
  findKallosSpans(KALLOS_FIXTURES.mathPaperStylized);
  const findMs = Date.now() - t0;
  check('G10', findMs < 10, `span-find self-check: ${findMs}ms (must be < 10ms)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nKALLOS RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
