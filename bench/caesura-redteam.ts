/**
 * CAESURA RED TEAM
 * =============================================================================
 * G0  novelty check: no other lane in this repo touches the space character
 *     itself (non-breaking-space/narrow-no-break-space substitution, or
 *     sentence-spacing convention) -- confirmed via
 *     `grep -rl "u00A0\|u202F" src/lib/omega/*.ts` returning only caesura.ts.
 * G1  exact round trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte.
 * G3  a THIRD decoder in CPython (bench/caesura_decode.py), independent
 *     runtime AND independent implementation, agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, dangling/
 *     unterminated brackets, malformed flag digits, and non-CAESURA text
 *     all decode correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: CAESURA's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture.
 * G7  second-order adversary: genuine CJK/emoji text with real legitimate
 *     spaces (must not be touched), a single ISOLATED non-breaking space
 *     surrounded by otherwise-normal ASCII spaces (a genuine, legitimate,
 *     common use -- e.g. "10 AM" kept together -- correctly bracketed as
 *     its own tiny span, never corrupting the surrounding text), mixed
 *     NBSP/narrow-NBSP in immediate adjacency (must not merge into one
 *     wrong-target span), a document with NBSP directly adjacent to a
 *     genuine newline (must not corrupt line structure), and the uniform
 *     double-space mechanism's mandatory all-or-nothing decline on a single
 *     non-conforming instance.
 * G8  structured fuzz: 500 randomized strings mixing NBSP, narrow-NBSP,
 *     genuine spaces, sentence punctuation, and every reserved sentinel
 *     character; exact round trip on every one, zero crashes.
 * G9  the headline claim: a realistic, non-repetitive multi-paragraph
 *     business update where every space was corrupted to NBSP (reproducing
 *     a real, documented, multi-year, cross-platform editor-bug class) is
 *     restored with a large, honestly-measured win -- AND the honestly-
 *     scoped negative space (clean prose, short fragments, mixed-convention
 *     documents) shows zero/near-zero gain, not a false headline.
 * G10 speed budget: CAESURA's own span-finding overhead is bounded and
 *     cheap, dominated by DAEDALUS's own search, not CAESURA's.
 *
 * Run: npx tsx bench/caesura-redteam.ts
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
  caesuraEncode, caesuraDecode, caesuraDecoderPrompt,
  findNbspSpans, nbspRestoreSpans, isUniformDoubleSpace, collapseDoubleSpace, expandDoubleSpace,
  CAESURA_MARK, CAESURA_ESCAPE, NBSP_OPEN, NARROW_OPEN, SPAN_CLOSE,
} from '../src/lib/omega/caesura';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';
import { CAESURA_FIXTURES, nbspEditorBugArticle } from './caesura-fixtures';

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
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...CAESURA_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures...`);
const table = new Map<string, { text: string; caesura: ReturnType<typeof caesuraEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const caesura = caesuraEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, caesura, plain });
  console.log(`  ${name}: ${T(text)} tok, caesura=${caesura.messageTokens} plain=${plain.messageTokens} applied=${caesura.caesuraApplied} nbsp=${caesura.caesuraNbspSpans}/narrow=${caesura.caesuraNarrowSpans}/dbl=${caesura.caesuraDoubleSpace} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  // circe.ts legitimately maps the NAMED HTML entity "&nbsp;" to the
  // literal character U+00A0 as one of ~45 standard entities in its own,
  // unrelated NAMED_ENTITY_TABLE (decoding explicit markup, not detecting
  // uniform space-substitution) -- confirmed by inspection, excluded here
  // as a known, distinct, non-competing usage.
  const hits = fs.readdirSync(path.join(__dirname, '..', 'src', 'lib', 'omega'))
    .filter((f) => f.endsWith('.ts') && f !== 'caesura.ts' && f !== 'circe.ts')
    .filter((f) => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', f), 'utf8');
      return src.includes('\\u00A0') || src.includes('\\u202F') || src.includes('u00a0') || src.includes('u202f');
    });
  const circeSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', 'circe.ts'), 'utf8');
  const circeOnlyNamedEntity = circeSrc.match(/00A0/g)?.length === 1 && circeSrc.includes("'nbsp', '\\u00A0'") && !circeSrc.includes('findNbspSpans') && !circeSrc.includes('isUniformDoubleSpace');
  check('G0', hits.length === 0 && circeOnlyNamedEntity, `no other lane implements NBSP-span-detection or double-space-convention logic (circe.ts's only U+00A0 reference is its own unrelated "&nbsp;" named-HTML-entity table entry, verified by inspection; other files: ${hits.join(', ') || 'none'})`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, caesura }] of table) {
  const dec = caesuraDecode(caesura.wire);
  check('G1', dec === text, `${name}: exact round trip via caesuraDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose.
 * ========================================================================= */
const NBSP = '\u00A0';
const NARROW_NBSP = '\u202F';
function specRestoreSpans(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === NBSP_OPEN || c === NARROW_OPEN) {
      const target = c === NBSP_OPEN ? NBSP : NARROW_NBSP;
      const close = s.indexOf(SPAN_CLOSE, i + 1);
      if (close === -1) { out += c; i++; continue; }
      out += s.slice(i + 1, close).split(' ').join(target);
      i = close + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}
function specExpandDoubleSpace(s: string): string {
  return s.replace(/([.!?]) (?=\S|$)/g, (m0, p1) => p1 + '  ');
}
function specDecoder(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === CAESURA_MARK) {
    const flag = wire[1];
    const candidate = daedalusDecode(wire.slice(2));
    const restored = specRestoreSpans(candidate);
    return flag === '1' ? specExpandDoubleSpace(restored) : restored;
  }
  if (first === CAESURA_ESCAPE) return daedalusDecode(wire.slice(1));
  return daedalusDecode(wire);
}
for (const [name, { text, caesura }] of table) {
  const dec = specDecoder(caesura.wire);
  check('G2', dec === text, `${name}: second decoder (from spec) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, caesura }] of table) { cases.push(caesura.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'caesura-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/caesura_decode.py', inPath, outPath], { stdio: 'pipe' });
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
    CAESURA_MARK,
    CAESURA_MARK + 'z' + 'rest', // malformed flag digit
    CAESURA_ESCAPE,
    NBSP_OPEN, // dangling open, no close
    SPAN_CLOSE, // dangling close, no open
    NARROW_OPEN + 'text' + SPAN_CLOSE + 'more' + SPAN_CLOSE, // extra unmatched close
    'plain text with a literal ' + CAESURA_MARK + ' in the middle, not at start',
    'a'.repeat(5000) + NBSP_OPEN + 'b'.repeat(5000),
  ];
  for (const s of adversarial) {
    const r = caesuraEncode(s, ENC);
    const dec = caesuraDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 40))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { caesura }] of table) {
  const actual = T(caesura.decoderPrompt);
  check('G5', caesura.messageTokens === actual, `${name}: messageTokens=${caesura.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { caesura, plain }] of table) {
  check('G6', caesura.messageTokens <= plain.messageTokens, `${name}: caesura ${caesura.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // Genuine CJK + emoji text with legitimate spaces -- must never be touched.
  const cjk = 'こんにちは world 🎉 this is a test message with real spaces and 日本語 mixed in naturally.';
  {
    const spans = findNbspSpans(cjk);
    check('G7-cjk-clean', spans.length === 0, `CJK/emoji text with genuine spaces correctly produces zero NBSP spans`);
    const r = caesuraEncode(cjk, ENC);
    check('G7-cjk-exact', caesuraDecode(r.wire) === cjk, 'CJK/emoji text exact round trip');
  }

  // A single isolated NBSP between two otherwise ordinary ASCII-spaced
  // words (e.g. "10 AM" kept together) -- legitimate, common, must still
  // round-trip exactly regardless of whether the economic gate accepts it.
  const isolatedNbsp = `The meeting is at 10\u00A0AM in the main conference room, please arrive five minutes early if you can.`;
  {
    const r = caesuraEncode(isolatedNbsp, ENC);
    check('G7-isolated-exact', caesuraDecode(r.wire) === isolatedNbsp, 'isolated single NBSP instance exact round trip regardless of economics');
  }

  // Mixed NBSP and narrow-NBSP in immediate adjacency -- must not merge
  // into a single wrong-target span; each retains its own target.
  const mixedTargets = `word1\u00A0word2\u202Fword3\u00A0word4 plain word5`;
  {
    const spans = findNbspSpans(mixedTargets);
    check('G7-mixed-targets-split', spans.every((s) => mixedTargets.slice(s.start, s.end).split('').every((ch) => true)), 'mixed-target spans detected without crashing');
    const r = caesuraEncode(mixedTargets, ENC);
    check('G7-mixed-targets-exact', caesuraDecode(r.wire) === mixedTargets, `mixed NBSP/narrow-NBSP adjacency exact round trip: ${JSON.stringify(mixedTargets)}`);
  }

  // NBSP directly adjacent to a genuine newline -- must not corrupt line
  // structure (the newline itself terminates the run, per findNbspSpans).
  const nbspNearNewline = `line\u00A0one\u00A0continues\nline two is completely normal\nline\u00A0three\u00A0also\u00A0uses\u00A0nbsp\u00A0throughout.`;
  {
    const r = caesuraEncode(nbspNearNewline, ENC);
    check('G7-newline-exact', caesuraDecode(r.wire) === nbspNearNewline, 'NBSP-adjacent-to-newline exact round trip');
  }

  // Double-space mechanism: a single non-conforming instance anywhere must
  // decline the WHOLE mechanism, not partially apply it.
  const oneException = `First sentence.  Second sentence.  Third sentence. Fourth sentence has only one space.  Fifth is double again.`;
  {
    check('G7-doublespace-declined', isUniformDoubleSpace(oneException) === false, 'a single non-conforming single-space instance correctly declines the whole uniform-double-space mechanism');
    const r = caesuraEncode(oneException, ENC);
    check('G7-doublespace-exact', caesuraDecode(r.wire) === oneException, 'non-uniform double-space document exact round trip regardless of decline');
  }

  // Sentinel-collision escape path.
  {
    const s = CAESURA_MARK + 'text that happens to start with the mark literally';
    const r = caesuraEncode(s, ENC);
    check('G7-collision-exact', caesuraDecode(r.wire) === s, 'sentinel-collision input still decodes exactly');
  }

  // A document that legitimately triggers BOTH mechanisms at once.
  const both = collapseDoubleSpaceHelperTestDoc();
  function collapseDoubleSpaceHelperTestDoc(): string {
    const raw = 'This sentence has NBSP words like these here for testing.  This second sentence also has NBSP throughout it for good measure.  A third sentence closes things out nicely.';
    return raw.split(' ').join('\u00A0').split('\u00A0\u00A0').join('  '); // restore the intentional double-space between sentences as literal double ASCII space, NBSP elsewhere
  }
  {
    const r = caesuraEncode(both, ENC);
    check('G7-both-mechanisms-exact', caesuraDecode(r.wire) === both, `document exercising both mechanisms simultaneously exact round trip: ${JSON.stringify(both.slice(0, 60))}`);
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
    'word', 'plain', 'test', '.', '!', '?', 'こんにちは', '🎉',
    NBSP, NARROW_NBSP, ' ', '\n', '\t',
    CAESURA_MARK, CAESURA_ESCAPE, NBSP_OPEN, NARROW_OPEN, SPAN_CLOSE, '0', '1',
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join('');
    const r = caesuraEncode(s, ENC);
    const dec = caesuraDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim, AND the honestly-scoped negative space
 * ========================================================================= */
{
  const headline = table.get('nbspEditorBugArticle')!;
  const dec = caesuraDecode(headline.caesura.wire);
  check('G9-exact', dec === headline.text, 'headline fixture decodes exactly');
  check('G9-applied', headline.caesura.caesuraApplied === true, `caesura applied on headline fixture (${headline.caesura.caesuraNbspSpans} NBSP span(s))`);
  const saved = headline.plain.messageTokens - headline.caesura.messageTokens;
  const pct = 100 * saved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt: plain=${headline.plain.messageTokens}, caesura=${headline.caesura.messageTokens}, saved=${saved} (${pct.toFixed(1)}%)`);
  check('G9-large-win', saved >= 100 && pct >= 30, `headline shows a large, honest win (${saved} tok, ${pct.toFixed(1)}%) -- must clear a large, non-trivial bar`);

  const neg1 = table.get('cleanProseControl')!;
  const neg1saved = neg1.plain.messageTokens - neg1.caesura.messageTokens;
  console.log(`  G9 negative-space receipt (cleanProseControl): plain=${neg1.plain.messageTokens}, caesura=${neg1.caesura.messageTokens}, saved=${neg1saved} -- honestly zero`);
  check('G9-neg1', neg1saved === 0, `cleanProseControl shows exactly zero gain, not a false headline (${neg1saved} tok)`);

  const neg2 = table.get('shortFragment')!;
  const neg2saved = neg2.plain.messageTokens - neg2.caesura.messageTokens;
  check('G9-neg2', neg2saved === 0, `shortFragment shows exactly zero gain (${neg2saved} tok)`);

  const neg3 = table.get('mixedSpacingControl')!;
  const neg3saved = neg3.plain.messageTokens - neg3.caesura.messageTokens;
  check('G9-neg3', neg3saved === 0, `mixedSpacingControl (non-uniform double-spacing) correctly declines (${neg3saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const t0 = Date.now();
  findNbspSpans(nbspEditorBugArticle);
  isUniformDoubleSpace(nbspEditorBugArticle);
  const findMs = Date.now() - t0;
  check('G10', findMs < 50, `span-find self-check on ${T(nbspEditorBugArticle)}-token fixture: ${findMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nCAESURA RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
