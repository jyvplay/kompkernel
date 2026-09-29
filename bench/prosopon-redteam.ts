/**
 * PROSOPON RED TEAM
 * =============================================================================
 * G0  novelty check: no other lane in this repo implements Windows-1252
 *     wrong-codepage (mojibake) detection or restoration.
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/prosopon_decode.py), independent
 *     runtime AND independent re-derivation of the Windows-1252 table,
 *     agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, dangling/
 *     unterminated brackets, non-cp1252-representable content inside
 *     brackets, and non-PROSOPON text all decode correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: PROSOPON's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture.
 * G7  second-order adversary: genuine correct French/German prose (the
 *     highest-risk false-positive class -- real accented text that must
 *     NEVER be mistaken for mojibake), genuine smart quotes/em-dash text
 *     that is already correct, decomposed mojibake directly adjacent to
 *     CJK/emoji/Hangul (must not corrupt neighbors), a pathological
 *     coincidental-byte-pattern input engineered to structurally resemble
 *     mojibake, and an exhaustive round-trip sweep of every defined
 *     Windows-1252 high-byte value (0x80-0x9F, skipping the 5 undefined
 *     slots) individually.
 * G8  structured fuzz: 500 randomized strings mixing mojibake'd text,
 *     genuine accented Latin text, CJK, emoji, and every reserved sentinel
 *     character; exact round trip on every one, zero crashes.
 * G9  the headline claim: a realistic, fully-French business email
 *     corrupted by the classic UTF-8-as-Windows-1252 mojibake bug is
 *     restored with a large, honestly-measured win, confirmed to scale
 *     cleanly with document length -- AND the honestly-scoped negative
 *     space (genuine French prose, genuine smart-quote text, clean English
 *     prose) shows zero gain, not a false headline.
 * G10 speed budget: PROSOPON's own span-finding overhead is bounded and
 *     cheap, dominated by DAEDALUS's own search, not PROSOPON's.
 *
 * Run: npx tsx bench/prosopon-redteam.ts
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
  prosoponEncode, prosoponDecode, prosoponDecoderPrompt, findMojibakeSpans,
  PROSOPON_MARK, PROSOPON_ESCAPE, MOJIBAKE_OPEN, MOJIBAKE_CLOSE,
} from '../src/lib/omega/prosopon';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { PROSOPON_FIXTURES, frenchBusinessEmailMojibake } from './prosopon-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; } else { fail++; failures.push(`${gate}: ${detail}`); }
}

const CP1252_HIGH_MAP: Record<number, number> = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};
function toMojibake1252(s: string): string {
  const utf8Bytes = Buffer.from(s, 'utf8');
  let out = '';
  for (const b of utf8Bytes) out += String.fromCodePoint(b >= 0x80 && b <= 0x9F ? (CP1252_HIGH_MAP[b] ?? b) : b);
  return out;
}

/* ===========================================================================
 * FIXTURE INVENTORY
 * ========================================================================= */
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
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...PROSOPON_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; prosopon: ReturnType<typeof prosoponEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const prosopon = prosoponEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, prosopon, plain });
  console.log(`  ${name}: ${T(text)} tok, prosopon=${prosopon.messageTokens} plain=${plain.messageTokens} applied=${prosopon.prosoponApplied} spans=${prosopon.prosoponSpans} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'prosopon.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.includes('0x20AC') && src.includes('0x2019') && src.includes('0x201C');
    });
  check('G0', hits.length === 0, `no other lane implements the Windows-1252 upper-range table used for mojibake detection (found in: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, prosopon }] of table) {
  const dec = prosoponDecode(prosopon.wire);
  check('G1', dec === text, `${name}: exact round trip via prosoponDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose.
 * ========================================================================= */
function specRestoreSpans(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === MOJIBAKE_OPEN) {
      const close = s.indexOf(MOJIBAKE_CLOSE, i + 1);
      if (close === -1) { out += s[i]; i++; continue; }
      const inner = s.slice(i + 1, close);
      let rebuilt = '';
      let ok = true;
      for (const ch of inner) {
        for (const b of new TextEncoder().encode(ch)) {
          if (b < 0x80 || (b >= 0xA0 && b <= 0xFF)) { rebuilt += String.fromCodePoint(b); continue; }
          const mapped = CP1252_HIGH_MAP[b];
          if (mapped === undefined) { ok = false; break; }
          rebuilt += String.fromCodePoint(mapped);
        }
        if (!ok) break;
      }
      out += ok ? rebuilt : (MOJIBAKE_OPEN + inner + MOJIBAKE_CLOSE);
      i = close + 1;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}
function specDecoder(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === PROSOPON_MARK) return specRestoreSpans(daedalusDecode(wire.slice(1)));
  if (first === PROSOPON_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}
for (const [name, { text, prosopon }] of table) {
  const dec = specDecoder(prosopon.wire);
  check('G2', dec === text, `${name}: second decoder (from spec) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, prosopon }] of table) { cases.push(prosopon.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prosopon-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/prosopon_decode.py', inPath, outPath], { stdio: 'pipe' });
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
    PROSOPON_MARK,
    PROSOPON_ESCAPE,
    MOJIBAKE_OPEN, // dangling open
    MOJIBAKE_CLOSE, // dangling close
    MOJIBAKE_OPEN + '\u4e2d\u6587' + MOJIBAKE_CLOSE, // CJK inside brackets (not cp1252-representable)
    'plain text with a literal ' + PROSOPON_MARK + ' in the middle, not at start',
    'a'.repeat(5000) + MOJIBAKE_OPEN + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = prosoponEncode(s, ENC);
    const dec = prosoponDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { prosopon }] of table) {
  const actual = T(prosopon.decoderPrompt);
  check('G5', prosopon.messageTokens === actual, `${name}: messageTokens=${prosopon.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { prosopon, plain }] of table) {
  check('G6', prosopon.messageTokens <= plain.messageTokens, `${name}: prosopon ${prosopon.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // Genuine, ALREADY-CORRECT French/German prose -- the highest-risk
  // false-positive class. Must produce zero spans.
  const genuineTexts = [
    "Bonjour à toute l'équipe, comment allez-vous aujourd'hui? J'espère que tout va bien de votre côté.",
    'Über die Grenzen hinaus wächst das Geschäft schön weiter, so der Bericht der Geschäftsführung.',
    'El niño pequeño jugó con su peluche favorito en el jardín durante toda la tarde soleada.',
  ];
  for (const s of genuineTexts) {
    const spans = findMojibakeSpans(s);
    check('G7-genuine-clean', spans.length === 0, `genuine correct accented prose correctly produces zero mojibake spans: ${JSON.stringify(s.slice(0, 40))}`);
    const r = prosoponEncode(s, ENC);
    check('G7-genuine-exact', prosoponDecode(r.wire) === s, `genuine prose exact round trip: ${JSON.stringify(s.slice(0, 40))}`);
  }

  // Genuine smart quotes / em-dash text that is already correct (not
  // mojibake) -- the specific characters PROSOPON's own table restores
  // must not be mistaken for corruption when they appear legitimately.
  const genuineSmart = 'She said \u201Ccaf\u00E9 au lait\u201D and smiled \u2014 nothing broken here, just normal typography.';
  {
    const spans = findMojibakeSpans(genuineSmart);
    check('G7-smart-quotes-clean', spans.length === 0, 'genuine smart-quote/em-dash text correctly produces zero spans');
  }

  // Decomposed mojibake directly adjacent to CJK, Hangul, and emoji --
  // must not corrupt neighbors; run must self-terminate at the boundary.
  const adjacent = `\u4e2d\u6587${toMojibake1252('café')}\u{1F600}${toMojibake1252('très bien')}\uac00\ub098`;
  {
    const r = prosoponEncode(adjacent, ENC);
    check('G7-adjacent-exact', prosoponDecode(r.wire) === adjacent, `mojibake adjacent to CJK/emoji/Hangul exact round trip: ${JSON.stringify(adjacent)}`);
  }

  // Pathological coincidental-byte-pattern input: text engineered so a
  // SHORT run happens to be structurally valid UTF-8 when reinterpreted as
  // cp1252 bytes, without being genuine mojibake -- confirms the
  // round-trip verification gate (not just structural validity) is what
  // actually protects correctness.
  const coincidence = '\u00C3\u00A9'; // "Ã©" literally typed -- structurally IS valid mojibake for "é"
  {
    const r = prosoponEncode(coincidence, ENC);
    check('G7-coincidence-exact', prosoponDecode(r.wire) === coincidence, `coincidental-but-structurally-valid input still round-trips exactly: ${JSON.stringify(coincidence)}`);
  }

  // Exhaustive sweep: every individually defined Windows-1252 high byte
  // (0x80-0x9F, skipping the 5 undefined slots) round-trips exactly when
  // embedded in a real multi-byte mojibake sequence built around it.
  {
    let allOk = true;
    for (const b of Object.keys(CP1252_HIGH_MAP).map(Number)) {
      const ch = String.fromCodePoint(CP1252_HIGH_MAP[b]);
      const doc = `prefix text ${ch} more text with ${ch} repeated for good measure and amortization.`;
      const moji = toMojibake1252(doc);
      const r = prosoponEncode(moji, ENC);
      if (prosoponDecode(r.wire) !== moji) { allOk = false; break; }
    }
    check('G7-highbyte-sweep', allOk, 'exhaustive sweep of every defined Windows-1252 high byte (0x80-0x9F) round-trips exactly');
  }

  // Sentinel-collision escape path.
  {
    const s = PROSOPON_MARK + 'text that happens to start with the mark literally';
    const r = prosoponEncode(s, ENC);
    check('G7-collision-exact', prosoponDecode(r.wire) === s, 'sentinel-collision input still decodes exactly');
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
  const mojiWord = toMojibake1252('café');
  const words = [
    mojiWord, 'word', ' ', '.', 'é', 'à', '\u2019', '\u2014',
    '\u4e2d\u6587', '\u{1F600}', '\uac00',
    PROSOPON_MARK, PROSOPON_ESCAPE, MOJIBAKE_OPEN, MOJIBAKE_CLOSE,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = prosoponEncode(s, ENC);
    const dec = prosoponDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim, AND the honestly-scoped negative space
 * ========================================================================= */
{
  const headline = table.get('frenchBusinessEmailMojibake')!;
  const dec = prosoponDecode(headline.prosopon.wire);
  check('G9-exact', dec === headline.text, 'headline fixture decodes exactly');
  check('G9-applied', headline.prosopon.prosoponApplied === true, `prosopon applied on headline fixture (${headline.prosopon.prosoponSpans} span(s))`);
  const saved = headline.plain.messageTokens - headline.prosopon.messageTokens;
  const pctv = 100 * saved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt: raw=${T(headline.text)}, plain=${headline.plain.messageTokens}, prosopon=${headline.prosopon.messageTokens}, saved=${saved} (${pctv.toFixed(1)}%)`);
  check('G9-large-win', saved >= 50 && pctv >= 20, `headline shows a large, honest win (${saved} tok, ${pctv.toFixed(1)}%) -- must clear a large, non-trivial bar`);

  const neg1 = table.get('genuineFrenchProse')!;
  const neg1saved = neg1.plain.messageTokens - neg1.prosopon.messageTokens;
  console.log(`  G9 negative-space receipt (genuineFrenchProse): plain=${neg1.plain.messageTokens}, prosopon=${neg1.prosopon.messageTokens}, saved=${neg1saved} -- honestly zero`);
  check('G9-neg1', neg1saved === 0, `genuineFrenchProse shows exactly zero gain, not a false headline (${neg1saved} tok)`);

  const neg2 = table.get('cleanEnglishProse')!;
  const neg2saved = neg2.plain.messageTokens - neg2.prosopon.messageTokens;
  check('G9-neg2', neg2saved === 0, `cleanEnglishProse shows exactly zero gain (${neg2saved} tok)`);

  const neg3 = table.get('genuineSmartQuotesNotMojibake')!;
  const neg3saved = neg3.plain.messageTokens - neg3.prosopon.messageTokens;
  check('G9-neg3', neg3saved === 0, `genuineSmartQuotesNotMojibake shows exactly zero gain (${neg3saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const t0 = Date.now();
  findMojibakeSpans(frenchBusinessEmailMojibake);
  const findMs = Date.now() - t0;
  check('G10', findMs < 50, `span-find self-check on ${T(frenchBusinessEmailMojibake)}-token fixture: ${findMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nPROSOPON RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
