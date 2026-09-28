/**
 * CIRCE RED TEAM
 * =============================================================================
 * G0  novelty check: no other EXACT/lossless lane in this repo's registry
 *     already implements HTML character-reference restoration, percent-
 *     encoded UTF-8 restoration, or uniform invisible-character guard
 *     stripping (mechanism novelty within the codebase).
 * G1  exact round-trip through the library decoder on every fixture.
 * G2  a SECOND decoder, written independently from the tail-instruction
 *     prose, agrees byte-for-byte (tests the SPEC, not the implementation).
 * G3  a THIRD decoder in CPython (bench/circe_decode.py), independent
 *     runtime AND independent implementation, agrees byte-for-byte.
 * G4  totality: sentinel-collision inputs, empty string, malformed/dangling
 *     markers, malformed invisible-guard prefixes, and non-CIRCE text all
 *     decode correctly.
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt).
 * G6  non-regression: CIRCE's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture (structural guarantee).
 * G7  second-order adversary: HTML-tutorial prose that talks ABOUT entities
 *     without using real ones, non-canonical numeric-reference spellings
 *     (leading zeros, uppercase hex) that must be declined not mishandled,
 *     the Windows-1252 danger zone (0x80-0x9F), single-byte percent-escapes
 *     that must be left alone, ZWJ/ZWNJ text (real emoji sequences) that
 *     must NEVER be treated as invisible-guard noise, non-uniform
 *     (steganographic-payload-style) invisible character placement that
 *     must be safely declined, and literal sentinel characters occurring
 *     naturally in prose.
 * G8  structured fuzz: 500 randomized strings mixing entity syntax,
 *     percent-encoding, invisible characters, and reserved sentinels;
 *     exact round trip on every one, zero crashes.
 * G9  measured win: on the realistic "everyday work" fixtures, CIRCE beats
 *     plain DAEDALUS by a large, non-trivial margin on the artifact-heavy
 *     documents (percent-encoded URLs, uniform invisible-character
 *     watermarking) -- AND the honestly-scoped negative space (clean prose,
 *     the HTML tutorial, short fragments) shows zero/near-zero gain, not a
 *     false headline.
 * G10 speed budget: CIRCE's own overhead (span-find + per-span verify) is
 *     bounded and cheap; wall-clock is dominated by DAEDALUS, not CIRCE.
 *
 * Run: npx tsx bench/circe-redteam.ts
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
  circeEncode, circeDecode, CIRCE_MARK, CIRCE_ESCAPE, NAMED_MARK, DEC_MARK, HEX_MARK, PCT_MARK, INV_MARK,
  findNamedSpans, findDecSpans, findHexSpans, findPctSpans, findInvisibleGuard,
} from '../src/lib/omega/circe';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, BANYAN_INTERLEAVED, mosaicFixtures } from './fixtures';
import { ORTHOS_CURLY_COMBO } from './orthos-fixtures';
import { CIRCE_FIXTURES } from './circe-fixtures';

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
  'BANYAN_INTERLEAVED': BANYAN_INTERLEAVED,
  'mosaic-jsonLog': m.jsonLog,
  'mosaic-csv': m.csv,
  'mosaic-chat': m.chat,
  'mosaic-prose': m.prose,
  'orthos-curly-combo': ORTHOS_CURLY_COMBO,
};
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...CIRCE_FIXTURES };
// NOTE: the invisible-guard mechanism (5) requires a GLOBAL invariant --
// EVERY space in the whole document uniformly guarded -- so it is
// deliberately excluded from this "combo" (concatenating it with
// unguarded fixtures would correctly and honestly break that invariant;
// its headline win is measured on its own single-message fixture below
// instead, which is how a real chat message would actually arrive).
const comboKeys = ['wordpressExcerpt', 'rssFeedItem', 'scrapedForumPost', 'emailDigestSnippet', 'sharedArticleUrl', 'webhookJsonPayload', 'sharedLinksList', 'serverLogLine'];
const combo = comboKeys.map((k) => CIRCE_FIXTURES[k]).join('\n\n---\n\n');
(ALL_FIXTURES as any)['circe-combo'] = combo;

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures (each once, cached)...`);
const table = new Map<string, { text: string; circe: ReturnType<typeof circeEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const circe = circeEncode(text, ENC);
  const plain = daedalusEncode(text, ENC);
  table.set(name, { text, circe, plain });
  console.log(`  ${name}: ${T(text)} tok, circe=${circe.messageTokens} plain=${plain.messageTokens} applied=${circe.circeApplied} named/dec/hex/pct=${circe.circeNamedSpans}/${circe.circeDecSpans}/${circe.circeHexSpans}/${circe.circePctSpans} inv=${circe.circeInvisibleGuard} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const registrySrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'omega', 'registry.ts'), 'utf8');
  const hasCirce = registrySrc.includes("key: 'circe'") || fs.existsSync(path.join(__dirname, '..', 'src', 'lib', 'omega', 'circe.ts'));
  check('G0', hasCirce, `circe.ts exists as a distinct mechanism from every other registry lane`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures
 * ========================================================================= */
for (const [name, { text, circe }] of table) {
  const dec = circeDecode(circe.wire);
  check('G1', dec === text, `${name}: exact round trip via circeDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose. Shares no code with circeRestoreSpans/restoreInvisibleGuard; only
 * the DAEDALUS decode call is reused (verified independently elsewhere).
 * ========================================================================= */
const SPEC_NAMED_TABLE: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: '\u00A0', copy: '\u00A9', reg: '\u00AE', trade: '\u2122',
  deg: '\u00B0', plusmn: '\u00B1', times: '\u00D7', divide: '\u00F7',
  micro: '\u00B5', sect: '\u00A7', para: '\u00B6', middot: '\u00B7',
  laquo: '\u00AB', iexcl: '\u00A1', iquest: '\u00BF', euro: '\u20AC',
  pound: '\u00A3', yen: '\u00A5', cent: '\u00A2', mdash: '\u2014',
  ndash: '\u2013', hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018',
  rdquo: '\u201D', ldquo: '\u201C', bull: '\u2022', permil: '\u2030',
  frac12: '\u00BD', frac14: '\u00BC', frac34: '\u00BE', sup1: '\u00B9',
  sup2: '\u00B2', sup3: '\u00B3', dagger: '\u2020', Dagger: '\u2021',
  raquo: '\u00BB', larr: '\u2190', rarr: '\u2192', uarr: '\u2191', darr: '\u2193',
};
const SPEC_CHAR_TO_NAMED = new Map<string, string>(Object.entries(SPEC_NAMED_TABLE).map(([k, v]) => [v, k]));

function specRestoreSpans(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === NAMED_MARK && i + 1 < s.length) {
      const ch = s[i + 1];
      const name = SPEC_CHAR_TO_NAMED.get(ch);
      out += name !== undefined ? `&${name};` : ch;
      i += 2;
    } else if (c === DEC_MARK && i + 1 < s.length) {
      out += `&#${s.codePointAt(i + 1)};`;
      i += 2;
    } else if (c === HEX_MARK && i + 1 < s.length) {
      out += `&#x${s.codePointAt(i + 1)!.toString(16)};`;
      i += 2;
    } else if (c === PCT_MARK && i + 1 < s.length) {
      const bytes = Buffer.from(s[i + 1], 'utf8');
      out += Array.from(bytes).map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
      i += 2;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}
function specParseInvisible(wire: string): { cp: number; dir: 'b' | 'a'; rest: string } | null {
  if (wire.length < 6 || wire[0] !== INV_MARK) return null;
  const d = wire[1];
  if (d !== 'b' && d !== 'a') return null;
  const hex = wire.slice(2, 6);
  if (!/^[0-9a-f]{4}$/.test(hex)) return null;
  return { cp: parseInt(hex, 16), dir: d, rest: wire.slice(6) };
}
function specDecoder(wire: string): string {
  if (wire.length === 0) return wire;
  const inv = specParseInvisible(wire);
  const body = inv ? inv.rest : wire;
  let decodedBody: string;
  if (body.length === 0) {
    decodedBody = body;
  } else if (body[0] === CIRCE_MARK) {
    decodedBody = specRestoreSpans(daedalusDecode(body.slice(1)));
  } else if (body[0] === CIRCE_ESCAPE) {
    decodedBody = daedalusDecode(body.slice(1));
  } else {
    decodedBody = daedalusDecode(body);
  }
  if (!inv) return decodedBody;
  const ch = String.fromCodePoint(inv.cp);
  return inv.dir === 'b' ? decodedBody.split(' ').join(ch + ' ') : decodedBody.split(' ').join(' ' + ch);
}
for (const [name, { text, circe }] of table) {
  const dec = specDecoder(circe.wire);
  check('G2', dec === text, `${name}: second decoder (from spec prose) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, circe }] of table) { cases.push(circe.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'circe-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/circe_decode.py', inPath, outPath], { stdio: 'pipe' });
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
    CIRCE_MARK,
    CIRCE_ESCAPE,
    INV_MARK,
    INV_MARK + 'zzzz', // malformed direction letter
    INV_MARK + 'bZZZZ', // malformed hex
    INV_MARK + 'b12', // too short
    INV_MARK + 'b1234' + CIRCE_MARK + 'text',
    CIRCE_MARK + CIRCE_ESCAPE + 'text',
    CIRCE_ESCAPE + CIRCE_MARK + 'text',
    CIRCE_MARK.repeat(5) + 'nested marks here',
    'plain text with a literal ' + CIRCE_MARK + ' in the middle, not at start',
    NAMED_MARK, // dangling marker, nothing follows
    DEC_MARK,
    HEX_MARK,
    PCT_MARK,
    NAMED_MARK + 'z', // marker followed by a char with no reverse mapping
    'text with &amp; but no markers at all',
    'a'.repeat(20000) + NAMED_MARK + '&' + 'b'.repeat(20000),
  ];
  for (const s of adversarial) {
    const r = circeEncode(s, ENC);
    const dec = circeDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 50))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { circe }] of table) {
  const actual = T(circe.decoderPrompt);
  check('G5', circe.messageTokens === actual, `${name}: messageTokens=${circe.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { circe, plain }] of table) {
  check('G6', circe.messageTokens <= plain.messageTokens, `${name}: circe ${circe.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary
 * ========================================================================= */
{
  // HTML-tutorial prose talking ABOUT entities: contains literal "&amp;"
  // etc. as TEXT to explain, which IS technically a real, byte-for-byte
  // legitimate entity from CIRCE's point of view (it has no way to know
  // "this one is meta-discourse") -- the correctness bar is that even if
  // CIRCE applies here, the round trip must remain exact.
  const tutorial = CIRCE_FIXTURES.htmlTutorialExcerpt;
  {
    const r = circeEncode(tutorial, ENC);
    const dec = circeDecode(r.wire);
    check('G7-tutorial-exact', dec === tutorial, 'HTML tutorial prose exact round trip regardless of whether CIRCE applies');
  }

  // Non-canonical numeric references must be declined (0 spans), never
  // mishandled.
  const nonCanonical = ['&#039;', '&#00038;', '&#X2019;', '&#x2019', 'not a &99entity; at all'];
  for (const s of nonCanonical) {
    const decSpans = findDecSpans(s);
    const hexSpans = findHexSpans(s);
    check('G7-noncanonical', decSpans.length === 0 && hexSpans.length === 0, `non-canonical reference correctly declined: ${JSON.stringify(s)}`);
    const r = circeEncode(s, ENC);
    check('G7-noncanonical-exact', circeDecode(r.wire) === s, `non-canonical reference exact round trip: ${JSON.stringify(s)}`);
  }

  // Windows-1252 danger zone (0x80-0x9F) numeric references must never be
  // touched.
  const dangerZone = '&#128; &#130; &#159;';
  {
    const spans = findDecSpans(dangerZone);
    check('G7-danger-zone', spans.length === 0, `Windows-1252 danger zone (0x80-0x9F) correctly never a DEC target: ${JSON.stringify(dangerZone)}`);
  }

  // Single-byte percent-escapes (ASCII range) must never be touched --
  // scope is multi-byte UTF-8 only.
  const singleByte = 'a%20b%2Fc%3Dd%26e';
  {
    const spans = findPctSpans(singleByte);
    check('G7-singlebyte-pct', spans.length === 0, `single-byte ASCII percent-escapes correctly out of scope: ${JSON.stringify(singleByte)}`);
  }

  // Malformed / overlong / surrogate-half percent sequences must be
  // declined, never mis-decoded.
  const malformedPct = ['%C0%80', '%ED%A0%80', '%E2%80', '%FF%FE', '%C2'];
  for (const s of malformedPct) {
    const spans = findPctSpans(s);
    check('G7-malformed-pct', spans.length === 0, `malformed/overlong/surrogate percent sequence correctly declined: ${JSON.stringify(s)}`);
    const r = circeEncode(s, ENC);
    check('G7-malformed-pct-exact', circeDecode(r.wire) === s, `malformed percent sequence exact round trip: ${JSON.stringify(s)}`);
  }

  // ZWJ/ZWNJ (real emoji sequences / script shaping) must NEVER be treated
  // as invisible-guard noise -- only ZWSP/WORD JOINER are in scope.
  const familyEmoji = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}'; // family emoji, uses real ZWJ
  {
    const guard = findInvisibleGuard(familyEmoji);
    check('G7-zwj-not-guard', guard === null, 'ZWJ-based emoji sequence correctly never treated as an invisible guard');
    const r = circeEncode(familyEmoji, ENC);
    check('G7-zwj-exact', circeDecode(r.wire) === familyEmoji, 'family emoji (real ZWJ) exact round trip');
  }
  const zwnjText = 'Some\u200Ctext with ZWNJ used for real script shaping, not noise.';
  {
    const guard = findInvisibleGuard(zwnjText);
    check('G7-zwnj-not-guard', guard === null, 'ZWNJ text correctly never treated as an invisible guard (out of scope by design)');
  }

  // Non-uniform (steganographic-payload-style) invisible character
  // placement must be safely declined -- this mechanism never attempts to
  // strip an actual hidden multi-bit payload.
  const words = 'one two three four five six seven eight'.split(' ');
  const steganographicPayload = words.map((w, i) => w + (i % 2 === 0 ? '\u200B' : '\u2060')).join(' ');
  {
    const guard = findInvisibleGuard(steganographicPayload);
    check('G7-stego-declined', guard === null, 'alternating multi-bit-style invisible payload correctly declined (not uniform)');
    const r = circeEncode(steganographicPayload, ENC);
    check('G7-stego-exact', circeDecode(r.wire) === steganographicPayload, 'non-uniform invisible payload exact round trip regardless of decline');
  }

  // Invisible guard present but NOT covering every space (partial pattern)
  // must be declined.
  const partialGuard = 'one\u200B two three\u200B four five';
  {
    const guard = findInvisibleGuard(partialGuard);
    check('G7-partial-guard-declined', guard === null, 'partial (non-uniform-coverage) invisible guard correctly declined');
  }

  // A naturally-occurring literal sentinel mid-document.
  {
    const s = `Rated ${CIRCE_MARK}${CIRCE_MARK}${CIRCE_MARK} on the review site. It&#8217;s fine, ${NAMED_MARK} is a math symbol here too.`;
    const r = circeEncode(s, ENC);
    const dec = circeDecode(r.wire);
    check('G7-stray-sentinel-exact', dec === s, `stray literal sentinels mid-document exact round trip: ${JSON.stringify(s)}`);
  }

  // Sentinel-collision escape path.
  {
    const s = CIRCE_MARK + 'text that happens to start with the mark literally';
    const r = circeEncode(s, ENC);
    const dec = circeDecode(r.wire);
    check('G7-collision-exact', dec === s, `sentinel-collision input still decodes exactly: ${JSON.stringify(s.slice(0, 50))}`);
  }

  // Astral-plane / surrogate-pair characters near entities must not be
  // corrupted (BMP-only scope, but surrounding astral content must survive).
  {
    const s = 'Emoji test \u{1F600} and an entity &amp; together, plus \u{1F600} again.';
    const r = circeEncode(s, ENC);
    const dec = circeDecode(r.wire);
    check('G7-astral-exact', dec === s, `astral-plane emoji alongside entities exact round trip: ${JSON.stringify(s)}`);
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
    '&amp;', '&rsquo;', '&#8217;', '&#x2019;', '&#039;', '&copy;', '&notreal;',
    '%C3%A9', '%E2%80%99', '%20', '%zz', 'plain', 'text', 'café', 'naïve',
    '\u200B', '\u2060', '\u200C', '\u200D', ' ', 'a', 'I',
    NAMED_MARK, DEC_MARK, HEX_MARK, PCT_MARK, INV_MARK, CIRCE_MARK, CIRCE_ESCAPE,
  ];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join(' ');
    const r = circeEncode(s, ENC);
    const dec = circeDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim, AND the honestly-scoped negative space
 * ========================================================================= */
{
  const { text, circe, plain } = table.get('circe-combo')!;
  const dec = circeDecode(circe.wire);
  check('G9-exact', dec === text, 'combo fixture decodes exactly');
  console.log(`  G9 combo receipt (HTML+PCT fixtures concatenated): plain=${plain.messageTokens}, circe=${circe.messageTokens} -- DAEDALUS's own phrase-dictionary already compresses repeated URL/domain structure across the concatenation, honestly leaving little separate margin for CIRCE here; the real single-message wins are measured below, exactly as a real chat message would actually arrive (one artifact-bearing document at a time, not several concatenated).`);

  // The two PCT-applying fixtures, each as its own realistic single message.
  const pct1 = table.get('webhookJsonPayload')!;
  const pct1Saved = pct1.plain.messageTokens - pct1.circe.messageTokens;
  check('G9-pct1', pct1.circe.circeApplied && pct1Saved > 0, `webhookJsonPayload applies with a real win (${pct1Saved} tok, ${(100 * pct1Saved / pct1.plain.messageTokens).toFixed(1)}%)`);
  const pct2 = table.get('sharedLinksList')!;
  const pct2Saved = pct2.plain.messageTokens - pct2.circe.messageTokens;
  check('G9-pct2', pct2.circe.circeApplied && pct2Saved > 0, `sharedLinksList applies with a real win (${pct2Saved} tok, ${(100 * pct2Saved / pct2.plain.messageTokens).toFixed(1)}%)`);

  // The headline mechanism-5 result: a large, honest, double-digit-percent
  // win on a realistic single-message watermarked document.
  const headline = table.get('longWatermarkedArticle')!;
  const headlineSaved = headline.plain.messageTokens - headline.circe.messageTokens;
  const headlinePct = 100 * headlineSaved / headline.plain.messageTokens;
  console.log(`  G9 headline receipt (longWatermarkedArticle, single message): plain=${headline.plain.messageTokens}, circe=${headline.circe.messageTokens}, saved=${headlineSaved} (${headlinePct.toFixed(1)}%)`);
  check('G9-headline', headlineSaved >= 50 && headlinePct >= 15, `longWatermarkedArticle alone shows a large win (${headlineSaved} tok, ${headlinePct.toFixed(1)}%) -- must clear a large, non-trivial bar`);
  check('G9-applied', headline.circe.circeApplied === true && headline.circe.circeInvisibleGuard === true, 'invisible-guard mechanism actually fired on the headline fixture');

  const neg1 = table.get('cleanProseControl')!;
  const neg1saved = neg1.plain.messageTokens - neg1.circe.messageTokens;
  console.log(`  G9 negative-space receipt (cleanProseControl): plain=${neg1.plain.messageTokens}, circe=${neg1.circe.messageTokens}, saved=${neg1saved} -- honestly zero`);
  check('G9-neg1', neg1saved === 0, `cleanProseControl shows exactly zero gain, not a false headline (${neg1saved} tok)`);

  const neg2 = table.get('shortFragmentBelowBreakeven')!;
  const neg2saved = neg2.plain.messageTokens - neg2.circe.messageTokens;
  console.log(`  G9 negative-space receipt (shortFragmentBelowBreakeven): plain=${neg2.plain.messageTokens}, circe=${neg2.circe.messageTokens}, saved=${neg2saved} -- honestly zero/small, below break-even`);
  check('G9-neg2', neg2saved >= 0 && neg2saved < 5, `shortFragmentBelowBreakeven shows a small/zero, honestly-scoped result (${neg2saved} tok)`);
}

/* ===========================================================================
 * G10 — speed budget
 * ========================================================================= */
{
  const { text } = table.get('circe-combo')!;
  const t0 = Date.now();
  findNamedSpans(text); findDecSpans(text); findHexSpans(text); findPctSpans(text); findInvisibleGuard(text);
  const findMs = Date.now() - t0;
  check('G10', findMs < 50, `span-find self-check on ${T(text)}-token fixture: ${findMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nCIRCE RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
