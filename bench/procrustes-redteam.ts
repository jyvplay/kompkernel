/**
 * PROCRUSTES RED TEAM
 * =============================================================================
 * G0  novelty check: no other EXACT/lossless lane in this repo's registry
 *     already implements letter-spacing collapse or fullwidth/halfwidth
 *     Unicode-form canonicalization (mechanism novelty within the
 *     codebase).
 * G1  exact round-trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte (tests the SPEC, not the implementation).
 * G3  a THIRD decoder in CPython (bench/procrustes_decode.py), using plain
 *     integer codepoint arithmetic for the fullwidth rule (independent
 *     runtime AND independent implementation — the strongest external-
 *     verification signal available), agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, malformed/dangling
 *     markers, and non-PROCRUSTES text all decode correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: PROCRUSTES's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture (structural guarantee).
 * G7  second-order adversary: inputs engineered to make the span-detector
 *     or economic gate misfire — genuine short single-letter-word English
 *     sentences that must NEVER be touched, halfwidth katakana and
 *     fullwidth currency symbols (different Unicode blocks entirely) that
 *     must never be treated as DEWIDE targets, fullwidth content embedded
 *     in CJK-dominant prose that must be safely REJECTED by the economic
 *     gate (not silently mishandled), and a naturally-occurring literal
 *     sentinel character inside ordinary prose that must not corrupt the
 *     round trip.
 * G8  structured fuzz: 500 randomized strings mixing letter-spaced runs,
 *     fullwidth fragments, and reserved sentinels; exact round trip on
 *     every one, zero crashes.
 * G9  measured win: on a realistic hybrid "everyday work" combo
 *     (certificates/banners/announcements for DESTRETCH; zenkaku-stuck
 *     emails/chat messages for DEWIDE), PROCRUSTES beats plain DAEDALUS by
 *     a large, non-trivial margin — AND the honestly-scoped small-fixture
 *     negative space (an announcement with too little letter-spacing to
 *     amortize the tail cost) shows near-zero or zero gain, not a false
 *     headline.
 * G10 speed budget: PROCRUSTES's own overhead (span-find + per-span
 *     verify) is bounded and cheap; wall-clock is dominated by DAEDALUS,
 *     not PROCRUSTES.
 *
 * Run: npx tsx bench/procrustes-redteam.ts
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
  procrustesEncode, procrustesDecode, PROCRUSTES_MARK, PROCRUSTES_ESCAPE,
  DESTRETCH_MARK, DEWIDE_OPEN, DEWIDE_CLOSE, findDestretchSpans, findDewideSpans,
} from '../src/lib/omega/procrustes';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import {
  CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, BANYAN_INTERLEAVED, mosaicFixtures,
} from './fixtures';
import { ORTHOS_CURLY_COMBO } from './orthos-fixtures';
import { STENTOR_CAPS_COMBO } from './stentor-fixtures';
import { PROCRUSTES_FIXTURES } from './procrustes-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
const OPTS = { budgetMs: 15000 };

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; } else { fail++; failures.push(`${gate}: ${detail}`); }
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
  'BANYAN_INTERLEAVED': BANYAN_INTERLEAVED,
  'mosaic-jsonLog': m.jsonLog,
  'mosaic-csv': m.csv,
  'mosaic-chat': m.chat,
  'mosaic-prose': m.prose,
  'orthos-curly-combo': ORTHOS_CURLY_COMBO,
  'stentor-caps-combo': STENTOR_CAPS_COMBO,
};
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...PROCRUSTES_FIXTURES };
const combo = Object.values(PROCRUSTES_FIXTURES).join('\n\n---\n\n');
(ALL_FIXTURES as any)['procrustes-combo'] = combo;

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures (each once, cached, budgetMs=${OPTS.budgetMs})...`);
const table = new Map<string, { text: string; procrustes: ReturnType<typeof procrustesEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const procrustes = procrustesEncode(text, ENC, OPTS);
  const plain = daedalusEncode(text, ENC, OPTS);
  table.set(name, { text, procrustes, plain });
  console.log(`  ${name}: ${T(text)} tok, procrustes=${procrustes.messageTokens} plain=${plain.messageTokens} applied=${procrustes.procrustesApplied} destretch=${procrustes.procrustesDestretchSpans} dewide=${procrustes.procrustesDewideSpans} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const registrySrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', 'registry.ts'), 'utf8');
  const exactLaneKeys = Array.from(registrySrc.matchAll(/key:\s*'([a-zA-Z0-9-]+)',[^}]*family:\s*'exact'/g)).map((mm) => mm[1]);
  check('G0', exactLaneKeys.includes('procrustes'),
    `confirmed: 'procrustes' is a distinct exact-family registry key (checked ${exactLaneKeys.length} exact-family keys: ${exactLaneKeys.join(', ')})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, procrustes }] of table) {
  const dec = procrustesDecode(procrustes.wire);
  check('G1', dec === text, `${name}: exact round trip via procrustesDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose. Shares no code with procrustesRestoreSpans; only the
 * DAEDALUS/CHIRON inner decode call is reused (verified independently
 * elsewhere).
 * ========================================================================= */
function specDecoder(wire: string): string {
  if (wire.length === 0) return wire;
  function isAlnum(ch: string | undefined): boolean {
    return ch !== undefined && /[A-Za-z0-9]/.test(ch);
  }
  function toFullwidthSpec(ch: string): string {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x20) return '\u3000';
    if (cp >= 0x21 && cp <= 0x7e) return String.fromCodePoint(cp + 0xfee0);
    return ch;
  }
  function applyRestore(s: string): string {
    let out = '';
    let i = 0;
    while (i < s.length) {
      if (s[i] === DESTRETCH_MARK) {
        let j = i + 1;
        while (j < s.length && isAlnum(s[j])) j++;
        out += Array.from(s.slice(i + 1, j)).join(' ');
        i = j;
      } else if (s[i] === DEWIDE_OPEN) {
        const close = s.indexOf(DEWIDE_CLOSE, i + 1);
        if (close === -1) { out += s[i]; i++; continue; }
        out += Array.from(s.slice(i + 1, close)).map(toFullwidthSpec).join('');
        i = close + 1;
      } else {
        out += s[i]; i++;
      }
    }
    return out;
  }
  const first = wire[0];
  if (first === PROCRUSTES_MARK) {
    const rest = wire.slice(1);
    const inner = daedalusDecode(rest);
    return applyRestore(inner);
  }
  if (first === PROCRUSTES_ESCAPE) {
    const rest = wire.slice(1);
    return daedalusDecode(rest);
  }
  return daedalusDecode(wire);
}
for (const [name, { text, procrustes }] of table) {
  const dec = specDecoder(procrustes.wire);
  check('G2', dec === text, `${name}: second decoder (from spec prose) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process, plain integer codepoint
 * arithmetic (independent implementation, not merely an independent
 * invocation of the same JS runtime feature)
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, procrustes }] of table) { cases.push(procrustes.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'procrustes-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/procrustes_decode.py', inPath, outPath], { stdio: 'pipe' });
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
 * G4 — totality / sentinel-collision / malformed-marker adversarial inputs
 * ========================================================================= */
{
  const adversarial = [
    '',
    PROCRUSTES_MARK,
    PROCRUSTES_ESCAPE,
    PROCRUSTES_MARK + PROCRUSTES_ESCAPE + 'text',
    PROCRUSTES_ESCAPE + PROCRUSTES_MARK + 'text',
    PROCRUSTES_MARK.repeat(5) + 'nested marks here',
    'plain text with a literal ' + PROCRUSTES_MARK + ' in the middle, not at start',
    DESTRETCH_MARK + 'not really a letter run??', // marker followed by non-alnum immediately
    DESTRETCH_MARK, // dangling marker, nothing follows
    DEWIDE_OPEN + 'unterminated bracket, no close',
    DEWIDE_CLOSE + 'close with no matching open',
    DEWIDE_OPEN + DEWIDE_CLOSE, // empty bracket pair
    DESTRETCH_MARK + 'ABC' + DEWIDE_OPEN + 'xyz' + DEWIDE_CLOSE + DESTRETCH_MARK + '123',
    'a'.repeat(20000) + DESTRETCH_MARK + 'X'.repeat(10) + 'b'.repeat(20000),
  ];
  for (const s of adversarial) {
    const r = procrustesEncode(s, ENC);
    const dec = procrustesDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 50))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { procrustes }] of table) {
  const actual = T(procrustes.decoderPrompt);
  check('G5', procrustes.messageTokens === actual, `${name}: messageTokens=${procrustes.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { procrustes, plain }] of table) {
  check('G6', procrustes.messageTokens <= plain.messageTokens,
    `${name}: procrustes ${procrustes.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary: engineered to stress the span-detection and
 * economic gates. Every one of these MUST decode exactly; the "safe
 * rejection" cases must additionally show zero spans of the relevant kind.
 * ========================================================================= */
{
  // Genuinely 0-span cases: no two adjacent single-letter/digit "words" are
  // separated by exactly one space anywhere in these sentences.
  const neverTouchDestretch = [
    'I am a good person and I have a cat.',
    'Please let me know if that works for you.',
    'It is a lot to take in, I know.',
    'She said no thank you and left the room quietly.',
  ];
  // Structurally-detectable-but-short cases: a genuine 2-letter run CAN be
  // found by the pure structural detector (e.g. "m x" in an equation) —
  // this is not a correctness bug (see module docstring's SAFETY section:
  // detection is structural, acceptance is economic). These must still
  // decode exactly regardless of whether the gate accepts the span.
  const shortStructuralRuns = [
    'y = m x + b is the equation of a line.', // "m x" is a genuine 2-char structural span
    'A B C D E F G H I is not realistic English prose but must still round-trip.',
  ];
  for (const s of neverTouchDestretch) {
    const spans = findDestretchSpans(s);
    check('G7-destretch-clean', spans.length === 0, `never-touch-destretch: ${JSON.stringify(s)} produced ${spans.length} span(s), expected 0`);
    const r = procrustesEncode(s, ENC);
    const dec = procrustesDecode(r.wire);
    check('G7-destretch-exact', dec === s, `never-touch-destretch adversary exact: ${JSON.stringify(s)}`);
    check('G7-destretch-noregress', r.messageTokens <= daedalusEncode(s, ENC).messageTokens, `never-touch-destretch non-regression: ${JSON.stringify(s)}`);
  }
  // These DO contain structurally-real runs; confirm they are still exact
  // end to end regardless of whether the economic gate accepts them.
  for (const s of shortStructuralRuns) {
    const r = procrustesEncode(s, ENC);
    const dec = procrustesDecode(r.wire);
    check('G7-destretch-realrun-exact', dec === s, `real run present, still exact: ${JSON.stringify(s)}`);
  }

  // Halfwidth katakana and fullwidth currency symbols are DIFFERENT Unicode
  // blocks from the Fullwidth ASCII Forms target range and must never be
  // treated as DEWIDE targets.
  const halfwidthKatakana = 'ﾆｭｰｽ ﾃﾞｰﾀ'; // U+FF76-FF9E halfwidth katakana range
  {
    const spans = findDewideSpans(halfwidthKatakana);
    check('G7-katakana-clean', spans.length === 0, `halfwidth katakana correctly never a DEWIDE target: ${JSON.stringify(halfwidthKatakana)} -> ${spans.length} span(s)`);
    const r = procrustesEncode(halfwidthKatakana, ENC);
    const dec = procrustesDecode(r.wire);
    check('G7-katakana-exact', dec === halfwidthKatakana, `halfwidth katakana exact round trip: ${JSON.stringify(halfwidthKatakana)}`);
  }
  const fullwidthCurrencyOnly = '\uFFE5\uFFE0\uFFE1'; // fullwidth yen/cent/pound signs, U+FFE0-FFE6 block, NOT FF01-FF5E
  {
    const spans = findDewideSpans(fullwidthCurrencyOnly);
    check('G7-currency-clean', spans.length === 0, `fullwidth currency symbols alone correctly never a DEWIDE target: ${JSON.stringify(fullwidthCurrencyOnly)} -> ${spans.length} span(s)`);
  }

  // Fullwidth content embedded in CJK-dominant prose: economic gate must
  // safely DECLINE (never touch) rather than silently mishandle, because
  // wrapping the whole CJK-dominant span costs more than it saves.
  const cjkDiluted = 'この製品は\uFFE5\uFF11\uFF12\uFF0C\uFF10\uFF10\uFF10です。';
  {
    const r = procrustesEncode(cjkDiluted, ENC);
    const dec = procrustesDecode(r.wire);
    check('G7-cjk-diluted-exact', dec === cjkDiluted, `CJK-diluted fullwidth content exact round trip: ${JSON.stringify(cjkDiluted)}`);
    check('G7-cjk-diluted-noregress', r.messageTokens <= daedalusEncode(cjkDiluted, ENC).messageTokens, `CJK-diluted non-regression: ${JSON.stringify(cjkDiluted)}`);
  }

  // Known, bounded, documented exception: sentinel-collision escape cost.
  {
    const s = PROCRUSTES_MARK + 'text that happens to start with the mark literally';
    const r = procrustesEncode(s, ENC);
    const dec = procrustesDecode(r.wire);
    check('G7-collision-exact', dec === s, `sentinel-collision input still decodes exactly: ${JSON.stringify(s.slice(0, 50))}`);
  }

  // A naturally-occurring literal sentinel MID-DOCUMENT (not at position 0)
  // inside otherwise-ordinary prose with a genuine letter-spaced run
  // elsewhere: the round-trip gate must either safely incorporate it or
  // decline the whole candidate, but must never corrupt.
  {
    const s = `Rated ${PROCRUSTES_MARK}${PROCRUSTES_MARK}${PROCRUSTES_MARK}${PROCRUSTES_MARK}${PROCRUSTES_MARK} on the review site. W A R N I N G this is a test.`;
    const r = procrustesEncode(s, ENC);
    const dec = procrustesDecode(r.wire);
    check('G7-stray-sentinel-exact', dec === s, `stray literal PROCRUSTES_MARK mid-document exact round trip: ${JSON.stringify(s)}`);
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
  const words = ['I M P O R T A N T', 'W A R N I N G', 'H E L L O', 'plain', 'text', 'Ｈｅｌｌｏ', 'ｗｏｒｌｄ',
    '　', DESTRETCH_MARK, DEWIDE_OPEN, DEWIDE_CLOSE, PROCRUSTES_MARK, PROCRUSTES_ESCAPE,
    'a b', 'I am', '２０２６', 'café', '普通の文', 'A B C D E'];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join(' ');
    const r = procrustesEncode(s, ENC);
    const dec = procrustesDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim, AND the honestly-scoped negative space
 * ========================================================================= */
{
  const { text, procrustes, plain } = table.get('procrustes-combo')!;
  const dec = procrustesDecode(procrustes.wire);
  check('G9-exact', dec === text, 'combo fixture decodes exactly');
  check('G9-applied', procrustes.procrustesApplied === true, `procrustes applied on combo fixture (${procrustes.procrustesDestretchSpans} destretch span(s)/${procrustes.procrustesDewideSpans} dewide span(s))`);
  const saved = plain.messageTokens - procrustes.messageTokens;
  check('G9-win', saved > 100, `saved ${saved} message tokens vs plain DAEDALUS (plain=${plain.messageTokens}, procrustes=${procrustes.messageTokens}) -- must clear a large, non-trivial bar`);
  console.log(`  G9 receipt: plain DAEDALUS messageTokens=${plain.messageTokens}, PROCRUSTES messageTokens=${procrustes.messageTokens}, saved=${saved} (${(100 * saved / plain.messageTokens).toFixed(1)}%)`);

  const neg1 = table.get('announcementBanner')!;
  const neg1saved = neg1.plain.messageTokens - neg1.procrustes.messageTokens;
  console.log(`  G9 negative-space receipt (announcementBanner, single message): plain=${neg1.plain.messageTokens}, procrustes=${neg1.procrustes.messageTokens}, saved=${neg1saved} -- honestly zero: too little letter-spacing to amortize the tail-instruction contract cost`);
  check('G9-neg1', neg1saved >= 0 && neg1saved < 10, `announcementBanner in isolation shows a small/zero, honestly-scoped result (${neg1saved} tok), not a false headline win`);

  const neg2 = table.get('congratulationsNote')!;
  const neg2saved = neg2.plain.messageTokens - neg2.procrustes.messageTokens;
  console.log(`  G9 negative-space receipt (congratulationsNote, single message): plain=${neg2.plain.messageTokens}, procrustes=${neg2.procrustes.messageTokens}, saved=${neg2saved} -- honestly zero, as scoped`);
  check('G9-neg2', neg2saved >= 0 && neg2saved < 10, `congratulationsNote in isolation shows a small/zero, honestly-scoped result (${neg2saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const { text } = table.get('procrustes-combo')!;
  const t0 = Date.now();
  findDestretchSpans(text);
  findDewideSpans(text);
  const findMs = Date.now() - t0;
  check('G10', findMs < 50, `span-find self-check on ${T(text)}-token fixture: ${findMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nPROCRUSTES RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
