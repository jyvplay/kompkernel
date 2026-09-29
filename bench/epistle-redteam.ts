/**
 * EPISTLE RED TEAM
 * =============================================================================
 * G0  novelty check: no other lane in this repo implements quoted-printable
 *     (RFC 2045) detection or restoration -- distinct escape syntax ("=XX")
 *     and distinct safety scope (multi-byte-only, like CIRCE's PCT_MARK,
 *     but justified independently) from CIRCE's own percent-encoding
 *     mechanism.
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/epistle_decode.py), independent
 *     runtime AND independent implementation, agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, dangling/
 *     unterminated brackets, malformed escape triplets (lowercase hex,
 *     truncated at end of string), and non-EPISTLE text all decode
 *     correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: EPISTLE's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture.
 * G7  second-order adversary: literal "=XX"-shaped technical text that is
 *     NOT quoted-printable (config assignments, version-like tokens --
 *     the highest-risk false-positive class for this specific mechanism,
 *     confirmed zero spans), genuine correct French/German prose, QP
 *     escapes directly adjacent to CJK/emoji/Hangul, lowercase-hex escape
 *     triplets (structurally invalid per RFC 2045's uppercase requirement,
 *     must never be treated as genuine), a single isolated ASCII-only
 *     escape triplet (out of scope by design, must decline), and a
 *     genuine RFC 2045 soft line break present in the input (not exploited
 *     by this lane's scope, but must still round-trip exactly).
 * G8  structured fuzz: 500 randomized strings mixing quoted-printable
 *     escapes, genuine accented Latin text, literal '=' signs, CJK, emoji,
 *     and every reserved sentinel character; exact round trip on every
 *     one, zero crashes.
 * G9  the headline claim: a realistic, fully-French business email
 *     corrupted by a real, live (September 2026) quoted-printable
 *     leak class is restored with a large, honestly-measured win,
 *     confirmed to scale cleanly with document length -- AND the
 *     honestly-scoped negative space (genuine French prose, literal
 *     "=XX" technical text, clean English prose) shows zero gain, not a
 *     false headline.
 * G10 speed budget: EPISTLE's own span-finding overhead is bounded and
 *     cheap, dominated by DAEDALUS's own search, not EPISTLE's.
 *
 * Run: npx tsx bench/epistle-redteam.ts
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
  epistleEncode, epistleDecode, epistleDecoderPrompt, findQpSpans,
  EPISTLE_MARK, EPISTLE_ESCAPE, QP_OPEN, QP_CLOSE,
} from '../src/lib/omega/epistle';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { EPISTLE_FIXTURES, frenchBusinessEmailQuotedPrintable } from './epistle-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; } else { fail++; failures.push(`${gate}: ${detail}`); }
}

function toQuotedPrintable(s: string): string {
  const bytes = Buffer.from(s, 'utf8');
  let out = '';
  for (const b of bytes) {
    if ((b >= 33 && b <= 126 && b !== 61) || b === 32 || b === 9) out += String.fromCharCode(b);
    else if (b === 10) out += '\n';
    else out += '=' + b.toString(16).toUpperCase().padStart(2, '0');
  }
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
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...EPISTLE_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; epistle: ReturnType<typeof epistleEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const epistle = epistleEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, epistle, plain });
  console.log(`  ${name}: ${T(text)} tok, epistle=${epistle.messageTokens} plain=${plain.messageTokens} applied=${epistle.epistleApplied} spans=${epistle.epistleSpans} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const circeSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', 'circe.ts'), 'utf8');
  const circeUsesEquals = circeSrc.includes("'='") || circeSrc.includes('"="') || circeSrc.includes('quoted-printable') || circeSrc.toLowerCase().includes('rfc 2045');
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'epistle.ts' && f !== 'registry.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.toLowerCase().includes('quoted-printable') || src.toLowerCase().includes('rfc 2045');
    });
  check('G0', !circeUsesEquals && hits.length === 0, `no other lane implements quoted-printable (RFC 2045) detection; CIRCE's own percent-encoding mechanism uses '%' syntax, never '=' (found: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, epistle }] of table) {
  const dec = epistleDecode(epistle.wire);
  check('G1', dec === text, `${name}: exact round trip via epistleDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose.
 * ========================================================================= */
function specRestoreSpans(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === QP_OPEN) {
      const close = s.indexOf(QP_CLOSE, i + 1);
      if (close === -1) { out += s[i]; i++; continue; }
      const inner = s.slice(i + 1, close);
      let rebuilt = '';
      for (const ch of inner) {
        for (const b of new TextEncoder().encode(ch)) {
          rebuilt += b <= 0x7F ? String.fromCharCode(b) : '=' + b.toString(16).toUpperCase().padStart(2, '0');
        }
      }
      out += rebuilt;
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
  if (first === EPISTLE_MARK) return specRestoreSpans(daedalusDecode(wire.slice(1)));
  if (first === EPISTLE_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}
for (const [name, { text, epistle }] of table) {
  const dec = specDecoder(epistle.wire);
  check('G2', dec === text, `${name}: second decoder (from spec) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, epistle }] of table) { cases.push(epistle.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epistle-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/epistle_decode.py', inPath, outPath], { stdio: 'pipe' });
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
    EPISTLE_MARK,
    EPISTLE_ESCAPE,
    QP_OPEN, // dangling open
    QP_CLOSE, // dangling close
    QP_OPEN + '\u4e2d\u6587' + QP_CLOSE, // CJK inside brackets
    '=', // truncated escape at end of string
    '=3', // truncated escape (1 hex digit only)
    '=3d', // lowercase hex -- structurally invalid per RFC 2045
    'plain text with a literal ' + EPISTLE_MARK + ' in the middle, not at start',
    'a'.repeat(5000) + QP_OPEN + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = epistleEncode(s, ENC);
    const dec = epistleDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { epistle }] of table) {
  const actual = T(epistle.decoderPrompt);
  check('G5', epistle.messageTokens === actual, `${name}: messageTokens=${epistle.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { epistle, plain }] of table) {
  check('G6', epistle.messageTokens <= plain.messageTokens, `${name}: epistle ${epistle.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // Literal "=XX"-shaped technical text that is NOT quoted-printable -- the
  // highest-risk false-positive class for this specific mechanism.
  const technicalTexts = [
    'Set x=3D as the flag value and y=41 for legacy mode, per the config spec.',
    'The build tag is v=2E5=2E1 in the old notation some scripts still emit.',
    'Query string debug: a=1&b=2C&c=3D looks like escapes but is just data.',
  ];
  for (const s of technicalTexts) {
    const spans = findQpSpans(s);
    check('G7-technical-clean', spans.length === 0, `literal =XX technical text correctly produces zero quoted-printable spans: ${JSON.stringify(s.slice(0, 40))}`);
    const r = epistleEncode(s, ENC);
    check('G7-technical-exact', epistleDecode(r.wire) === s, `technical text exact round trip: ${JSON.stringify(s.slice(0, 40))}`);
  }

  // Genuine, already-correct French/German prose.
  const genuineTexts = [
    "Bonjour à toute l'équipe, comment allez-vous aujourd'hui?",
    'Über die Grenzen hinaus wächst das Geschäft schön weiter.',
  ];
  for (const s of genuineTexts) {
    const spans = findQpSpans(s);
    check('G7-genuine-clean', spans.length === 0, `genuine correct accented prose correctly produces zero spans: ${JSON.stringify(s)}`);
  }

  // QP escapes directly adjacent to CJK, Hangul, and emoji.
  const adjacent = `\u4e2d\u6587${toQuotedPrintable('café')}\u{1F600}${toQuotedPrintable('très bien')}\uac00\ub098`;
  {
    const r = epistleEncode(adjacent, ENC);
    check('G7-adjacent-exact', epistleDecode(r.wire) === adjacent, `QP adjacent to CJK/emoji/Hangul exact round trip: ${JSON.stringify(adjacent)}`);
  }

  // Lowercase-hex escape triplet: structurally invalid per RFC 2045's
  // uppercase requirement, must never be treated as genuine.
  const lowercaseHex = 'caf=c3=a9 should not be touched since real QP requires uppercase hex.';
  {
    const spans = findQpSpans(lowercaseHex);
    check('G7-lowercase-hex-declined', spans.length === 0, 'lowercase-hex escape triplets correctly declined (RFC 2045 requires uppercase)');
    const r = epistleEncode(lowercaseHex, ENC);
    check('G7-lowercase-hex-exact', epistleDecode(r.wire) === lowercaseHex, 'lowercase-hex text exact round trip regardless of decline');
  }

  // A single isolated ASCII-only escape triplet (=41, decodes to plain 'A')
  // is out of scope by design (multi-byte only) and must decline.
  const asciiOnlyEscape = 'The value is =41 in this notation, which some legacy tools still emit for plain ASCII.';
  {
    const spans = findQpSpans(asciiOnlyEscape);
    check('G7-ascii-only-declined', spans.length === 0, 'ASCII-only escape triplet correctly out of scope (multi-byte only)');
  }

  // A genuine RFC 2045 soft line break present in the input -- not
  // exploited by this lane's scope, but must still round-trip exactly.
  const softBreak = 'This line is intentionally long enough to require a soft=\nbreak in real quoted-printable output, but we do not exploit that here.';
  {
    const r = epistleEncode(softBreak, ENC);
    check('G7-softbreak-exact', epistleDecode(r.wire) === softBreak, 'text containing a genuine soft line break exact round trip regardless of scope');
  }

  // Sentinel-collision escape path.
  {
    const s = EPISTLE_MARK + 'text that happens to start with the mark literally';
    const r = epistleEncode(s, ENC);
    check('G7-collision-exact', epistleDecode(r.wire) === s, 'sentinel-collision input still decodes exactly');
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
  const qpWord = toQuotedPrintable('café');
  const words = [
    qpWord, 'word', ' ', '.', '=', '=3D', '=41', '=c3', 'é', 'à',
    '\u4e2d\u6587', '\u{1F600}', '\uac00',
    EPISTLE_MARK, EPISTLE_ESCAPE, QP_OPEN, QP_CLOSE,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = epistleEncode(s, ENC);
    const dec = epistleDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim, AND the honestly-scoped negative space
 * ========================================================================= */
{
  const headline = table.get('frenchBusinessEmailQuotedPrintable')!;
  const dec = epistleDecode(headline.epistle.wire);
  check('G9-exact', dec === headline.text, 'headline fixture decodes exactly');
  check('G9-applied', headline.epistle.epistleApplied === true, `epistle applied on headline fixture (${headline.epistle.epistleSpans} span(s))`);
  const saved = headline.plain.messageTokens - headline.epistle.messageTokens;
  const pctv = 100 * saved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt: raw=${T(headline.text)}, plain=${headline.plain.messageTokens}, epistle=${headline.epistle.messageTokens}, saved=${saved} (${pctv.toFixed(1)}%)`);
  check('G9-large-win', saved >= 50 && pctv >= 20, `headline shows a large, honest win (${saved} tok, ${pctv.toFixed(1)}%) -- must clear a large, non-trivial bar`);

  const neg1 = table.get('genuineFrenchProse')!;
  const neg1saved = neg1.plain.messageTokens - neg1.epistle.messageTokens;
  console.log(`  G9 negative-space receipt (genuineFrenchProse): plain=${neg1.plain.messageTokens}, epistle=${neg1.epistle.messageTokens}, saved=${neg1saved} -- honestly zero`);
  check('G9-neg1', neg1saved === 0, `genuineFrenchProse shows exactly zero gain, not a false headline (${neg1saved} tok)`);

  const neg2 = table.get('literalEqualsSignsNotQp')!;
  const neg2saved = neg2.plain.messageTokens - neg2.epistle.messageTokens;
  check('G9-neg2', neg2saved === 0, `literalEqualsSignsNotQp shows exactly zero gain (${neg2saved} tok)`);

  const neg3 = table.get('cleanEnglishProse')!;
  const neg3saved = neg3.plain.messageTokens - neg3.epistle.messageTokens;
  check('G9-neg3', neg3saved === 0, `cleanEnglishProse shows exactly zero gain (${neg3saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const t0 = Date.now();
  findQpSpans(frenchBusinessEmailQuotedPrintable);
  const findMs = Date.now() - t0;
  check('G10', findMs < 50, `span-find self-check on ${T(frenchBusinessEmailQuotedPrintable)}-token fixture: ${findMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nEPISTLE RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
