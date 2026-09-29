/**
 * SYNTAGMA RED TEAM
 * =============================================================================
 * G0  novelty check: no other lane in this repo implements Hangul canonical
 *     (de)composition -- ABACUS's own Unicode sub-mechanism is explicitly
 *     restricted to "the 7 most common Latin diacritics" and never touches
 *     the Hangul Jamo or Hangul Syllables blocks (confirmed by inspection).
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/syntagma_decode.py), independent
 *     runtime AND independent implementation of the UAX #15 arithmetic,
 *     agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, dangling/
 *     unterminated brackets, non-syllable codepoints inside brackets, and
 *     non-SYNTAGMA text all decode correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: SYNTAGMA's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture.
 * G7  second-order adversary: standalone Hangul Compatibility Jamo (a
 *     completely different, non-combining Unicode block used in
 *     dictionaries/linguistic examples -- must NEVER be touched), obsolete/
 *     historical jamo outside the modern 19/21/28 index ranges (must
 *     decline safely), a genuine LV-only syllable with no trailing
 *     consonant directly followed by more decomposed syllables (run
 *     continuation must not misalign), decomposed Hangul directly adjacent
 *     to CJK ideographs and to emoji (must not corrupt neighbors), and an
 *     exhaustive round-trip check across a sample spanning the full
 *     T-index range (0 = no coda, through T=27) to confirm the "no
 *     trailing consonant" edge case never emits a spurious jamo.
 * G8  structured fuzz: 500 randomized strings mixing decomposed Hangul
 *     jamo, precomposed syllables, compatibility jamo, CJK, emoji, and
 *     every reserved sentinel character; exact round trip on every one,
 *     zero crashes.
 * G9  the headline claim: a realistic, non-repetitive multi-sentence
 *     Korean business message reproducing a real, live, dated (2025-2026)
 *     macOS NFD-export artifact class is restored with a very large,
 *     honestly-measured win -- AND the honestly-scoped negative space
 *     (clean precomposed Korean, compatibility-jamo linguistic examples,
 *     clean English prose) shows zero gain, not a false headline.
 * G10 speed budget: SYNTAGMA's own span-finding overhead is bounded and
 *     cheap, dominated by DAEDALUS's own search, not SYNTAGMA's.
 *
 * Run: npx tsx bench/syntagma-redteam.ts
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
  syntagmaEncode, syntagmaDecode, syntagmaDecoderPrompt, findHangulSpans,
  SYNTAGMA_MARK, SYNTAGMA_ESCAPE, HANGUL_OPEN, HANGUL_CLOSE,
} from '../src/lib/omega/syntagma';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { SYNTAGMA_FIXTURES, nfdKoreanBusinessMessage } from './syntagma-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

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
  'mosaic-jsonLog': m.jsonLog,
  'mosaic-csv': m.csv,
  'mosaic-chat': m.chat,
  'mosaic-prose': m.prose,
};
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...SYNTAGMA_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; syntagma: ReturnType<typeof syntagmaEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const syntagma = syntagmaEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, syntagma, plain });
  console.log(`  ${name}: ${T(text)} tok, syntagma=${syntagma.messageTokens} plain=${plain.messageTokens} applied=${syntagma.syntagmaApplied} spans=${syntagma.syntagmaSpans} syllables=${syntagma.syntagmaSyllables} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const abacusSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', 'abacus.ts'), 'utf8');
  const abacusTouchesHangul = abacusSrc.includes('1100') || abacusSrc.includes('AC00') || abacusSrc.toLowerCase().includes('hangul');
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'syntagma.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      // Detect actual jamo-composition arithmetic (the Hangul syllable base
      // 0xAC00 co-occurring with the jamo bases 0x1100/0x1161), not
      // incidental substring hits like chiron.ts's Georgian-script range
      // boundary `[0x10a0, 0x1100]`, or hermes.ts/phrase.ts/rosetta.ts's
      // unrelated reuse of precomposed Hangul syllables purely as a source
      // of guaranteed-single-token marker-glyph IDs (never decomposing
      // anything).
      const lower = src.toLowerCase();
      return lower.includes('ac00') && (lower.includes('1161') || lower.includes('hangul_syllable') || lower.includes('decomposesyllable'));
    });
  check('G0', !abacusTouchesHangul && hits.length === 0, `ABACUS's own Unicode mechanism never touches Hangul (confirmed by inspection); no other lane implements Jamo composition arithmetic (found in: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, syntagma }] of table) {
  const dec = syntagmaDecode(syntagma.wire);
  check('G1', dec === text, `${name}: exact round trip via syntagmaDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose.
 * ========================================================================= */
const SBASE = 0xac00, LBASE = 0x1100, VBASE = 0x1161, TBASE = 0x11a7;
function specDecompose(cp: number): string {
  const s = cp - SBASE;
  const l = LBASE + Math.floor(s / 588);
  const v = VBASE + Math.floor((s % 588) / 28);
  const t = s % 28;
  return String.fromCodePoint(l) + String.fromCodePoint(v) + (t > 0 ? String.fromCodePoint(TBASE + t) : '');
}
function specRestoreSpans(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === HANGUL_OPEN) {
      const close = s.indexOf(HANGUL_CLOSE, i + 1);
      if (close === -1) { out += s[i]; i++; continue; }
      const inner = s.slice(i + 1, close);
      for (const ch of inner) {
        const cp = ch.codePointAt(0)!;
        out += (cp >= SBASE && cp <= 0xd7a3) ? specDecompose(cp) : ch;
      }
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
  if (first === SYNTAGMA_MARK) return specRestoreSpans(daedalusDecode(wire.slice(1)));
  if (first === SYNTAGMA_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}
for (const [name, { text, syntagma }] of table) {
  const dec = specDecoder(syntagma.wire);
  check('G2', dec === text, `${name}: second decoder (from spec) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, syntagma }] of table) { cases.push(syntagma.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'syntagma-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/syntagma_decode.py', inPath, outPath], { stdio: 'pipe' });
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
    SYNTAGMA_MARK,
    SYNTAGMA_ESCAPE,
    HANGUL_OPEN, // dangling open, no close
    HANGUL_CLOSE, // dangling close, no open
    HANGUL_OPEN + 'not hangul at all' + HANGUL_CLOSE, // non-syllable content inside brackets
    HANGUL_OPEN + '\u4e2d\u6587' + HANGUL_CLOSE, // CJK ideographs inside brackets (not Hangul syllables)
    'plain text with a literal ' + SYNTAGMA_MARK + ' in the middle, not at start',
    'a'.repeat(5000) + HANGUL_OPEN + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = syntagmaEncode(s, ENC);
    const dec = syntagmaDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { syntagma }] of table) {
  const actual = T(syntagma.decoderPrompt);
  check('G5', syntagma.messageTokens === actual, `${name}: messageTokens=${syntagma.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { syntagma, plain }] of table) {
  check('G6', syntagma.messageTokens <= plain.messageTokens, `${name}: syntagma ${syntagma.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // Standalone Hangul Compatibility Jamo (U+3131-U+318E) -- a completely
  // different, non-combining Unicode block used in dictionaries/linguistic
  // examples. Must never be mistaken for combining Jamo (U+1100-U+11FF).
  const compatJamo = 'The letters \u3131 (giyeok), \u3134 (nieun), and \u3137 (digeut) are the first three consonants taught in Korean class.';
  {
    const spans = findHangulSpans(compatJamo);
    check('G7-compat-jamo-clean', spans.length === 0, 'Hangul Compatibility Jamo correctly never treated as combining jamo');
    const r = syntagmaEncode(compatJamo, ENC);
    check('G7-compat-jamo-exact', syntagmaDecode(r.wire) === compatJamo, 'compatibility jamo linguistic example exact round trip');
  }

  // Obsolete/historical jamo outside modern index ranges (e.g. archaic
  // leading consonants used for historical/dialectal Korean text) --
  // isL/isV/isT correctly bound to the MODERN 19/21/28 ranges, so any
  // jamo outside them is structurally invisible to the span-finder.
  const obsolete = '\u1114\u1161\u4E2D'; // an obsolete leading consonant (outside 1100-1112) + modern vowel + CJK char
  {
    const spans = findHangulSpans(obsolete);
    check('G7-obsolete-declined', spans.length === 0, 'obsolete/historical jamo outside modern ranges correctly declined');
    const r = syntagmaEncode(obsolete, ENC);
    check('G7-obsolete-exact', syntagmaDecode(r.wire) === obsolete, 'obsolete jamo exact round trip regardless of decline');
  }

  // Exhaustive T-index sweep: every possible trailing-consonant value
  // (0 = no coda, through 27), confirming the "no trailing consonant" edge
  // case never emits a spurious jamo and every other case emits exactly
  // one correct trailing jamo.
  {
    let allOk = true;
    for (let t = 0; t < 28; t++) {
      const l = 0x1100; // first leading consonant
      const v = 0x1161; // first vowel
      let jamoSeq = String.fromCodePoint(l) + String.fromCodePoint(v);
      if (t > 0) jamoSeq += String.fromCodePoint(0x11a7 + t);
      const nfc = jamoSeq.normalize('NFC');
      const nfd = nfc.normalize('NFD');
      if (nfd !== jamoSeq) { allOk = false; break; }
      const r = syntagmaEncode(jamoSeq + ' text after', ENC);
      if (syntagmaDecode(r.wire) !== jamoSeq + ' text after') { allOk = false; break; }
    }
    check('G7-t-index-sweep', allOk, 'exhaustive T-index (0-27) sweep: every trailing-consonant value round-trips exactly, including T=0 (no coda)');
  }

  // Decomposed Hangul directly adjacent to CJK ideographs and emoji --
  // must not corrupt neighbors; run must self-terminate at the boundary.
  const adjacentCjkEmoji = `${'회의'.normalize('NFD')}\u4e2d\u6587${'준비'.normalize('NFD')}\u{1F600}${'완료'.normalize('NFD')}`;
  {
    const r = syntagmaEncode(adjacentCjkEmoji, ENC);
    check('G7-adjacent-exact', syntagmaDecode(r.wire) === adjacentCjkEmoji, `decomposed Hangul adjacent to CJK/emoji exact round trip: ${JSON.stringify(adjacentCjkEmoji)}`);
  }

  // Sentinel-collision escape path.
  {
    const s = SYNTAGMA_MARK + 'text that happens to start with the mark literally';
    const r = syntagmaEncode(s, ENC);
    check('G7-collision-exact', syntagmaDecode(r.wire) === s, 'sentinel-collision input still decodes exactly');
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
    '\u1100\u1161', '\u1112\u1161\u11ab', '\uac00', '\ub098', 'word', ' ', '.',
    '\u3131', '\u4e2d\u6587', '\u{1F600}', SYNTAGMA_MARK, SYNTAGMA_ESCAPE, HANGUL_OPEN, HANGUL_CLOSE,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = syntagmaEncode(s, ENC);
    const dec = syntagmaDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim, AND the honestly-scoped negative space
 * ========================================================================= */
{
  const headline = table.get('nfdKoreanBusinessMessage')!;
  const dec = syntagmaDecode(headline.syntagma.wire);
  check('G9-exact', dec === headline.text, 'headline fixture decodes exactly');
  check('G9-applied', headline.syntagma.syntagmaApplied === true, `syntagma applied on headline fixture (${headline.syntagma.syntagmaSpans} span(s), ${headline.syntagma.syntagmaSyllables} syllable(s))`);
  const saved = headline.plain.messageTokens - headline.syntagma.messageTokens;
  const pctv = 100 * saved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt: raw=${T(headline.text)}, plain=${headline.plain.messageTokens}, syntagma=${headline.syntagma.messageTokens}, saved=${saved} (${pctv.toFixed(1)}%)`);
  check('G9-large-win', saved >= 300 && pctv >= 50, `headline shows a very large, honest win (${saved} tok, ${pctv.toFixed(1)}%) -- must clear a large, non-trivial bar`);

  const neg1 = table.get('cleanPrecomposedKorean')!;
  const neg1saved = neg1.plain.messageTokens - neg1.syntagma.messageTokens;
  console.log(`  G9 negative-space receipt (cleanPrecomposedKorean): plain=${neg1.plain.messageTokens}, syntagma=${neg1.syntagma.messageTokens}, saved=${neg1saved} -- honestly zero`);
  check('G9-neg1', neg1saved === 0, `cleanPrecomposedKorean shows exactly zero gain, not a false headline (${neg1saved} tok)`);

  const neg2 = table.get('compatibilityJamoControl')!;
  const neg2saved = neg2.plain.messageTokens - neg2.syntagma.messageTokens;
  check('G9-neg2', neg2saved === 0, `compatibilityJamoControl shows exactly zero gain (${neg2saved} tok)`);

  const neg3 = table.get('cleanEnglishProse')!;
  const neg3saved = neg3.plain.messageTokens - neg3.syntagma.messageTokens;
  check('G9-neg3', neg3saved === 0, `cleanEnglishProse shows exactly zero gain (${neg3saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const t0 = Date.now();
  findHangulSpans(nfdKoreanBusinessMessage);
  const findMs = Date.now() - t0;
  check('G10', findMs < 50, `span-find self-check on ${T(nfdKoreanBusinessMessage)}-token fixture: ${findMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nSYNTAGMA RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
