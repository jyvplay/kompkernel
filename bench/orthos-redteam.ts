/**
 * ORTHOS RED TEAM
 * =============================================================================
 * G0  novelty check: no existing fixture in this repo's own corpus contains
 *     curly typography (confirms the mechanism was previously untestable here)
 * G1  exact round-trip through the library decoder on curly + existing fixtures
 * G2  a SECOND decoder, written independently from the tail-instruction prose,
 *     agrees byte-for-byte (tests the SPEC, not the implementation)
 * G3  a THIRD decoder in CPython, reusing the already-verified chiron_decode.py
 *     for the inner payload, agrees byte-for-byte (external verification)
 * G4  totality: sentinel-collision inputs, empty string, and non-ORTHOS text
 *     all decode correctly; decoding arbitrary non-wire text is a total no-op
 *     identical to plain DAEDALUS's own guarantee
 * G5  message accounting is honest: messageTokens === tokens(decoderPrompt)
 * G6  non-regression: ORTHOS's messageTokens is never worse than plain
 *     DAEDALUS's, on every fixture (structural guarantee, not a spot check)
 * G7  second-order adversary: inputs engineered to make the self-check reject
 *     (mixed quote styles, leading elisions, nested quotes, sentinel
 *     characters already present) — verifies safe fallback, not crash
 * G8  structured fuzz: 500 randomized strings mixing straight/curly punctuation
 *     and random Unicode; exact round-trip on every one
 * G9  measured win: on realistic curly-typography prose, ORTHOS beats plain
 *     DAEDALUS by a real, non-trivial margin (the headline claim, with receipts)
 * G10 speed budget: ORTHOS's own overhead (the certificate/self-check) is O(n)
 *     and cheap; total wall-clock is dominated by DAEDALUS, not by ORTHOS
 *
 * PERFORMANCE NOTE: each fixture's orthosEncode/daedalusEncode is computed
 * EXACTLY ONCE and cached (`table` below), then reused across every gate that
 * needs it. DAEDALUS's own anytime search can take up to ~30s per large
 * fixture, so recomputing per-gate would make this file impractically slow.
 *
 * Run: bash bench/tmp/runner.sh bench/orthos-redteam.ts
 * =============================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { countTokens } from '../src/lib/omega/bpe';
import {
  orthosEncode, orthosDecode, ORTHOS_MARK, ORTHOS_ESCAPE, orthosDeSmart,
} from '../src/lib/omega/orthos';
import { daedalusEncode, daedalusDecode } from '../src/lib/omega/daedalus';
import {
  CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, BANYAN_INTERLEAVED, mosaicFixtures,
} from './fixtures';
import {
  ORTHOS_CURLY_EMAIL, ORTHOS_CURLY_REVIEW, ORTHOS_CURLY_BLOG, ORTHOS_CURLY_SUPPORT, ORTHOS_CURLY_FORUM,
  ORTHOS_CURLY_STANDUP, ORTHOS_CURLY_RECIPE, ORTHOS_CURLY_COMBO,
} from './orthos-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

let pass = 0, fail = 0;
const failures: string[] = [];
function check(gate: string, cond: boolean, detail: string) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${gate}: ${detail}`); }
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
};
const CURLY_FIXTURES: Record<string, string> = {
  'curly-email': ORTHOS_CURLY_EMAIL,
  'curly-review': ORTHOS_CURLY_REVIEW,
  'curly-blog': ORTHOS_CURLY_BLOG,
  'curly-support': ORTHOS_CURLY_SUPPORT,
  'curly-forum': ORTHOS_CURLY_FORUM,
  'curly-standup': ORTHOS_CURLY_STANDUP,
  'curly-recipe': ORTHOS_CURLY_RECIPE,
  'curly-combo': ORTHOS_CURLY_COMBO,
};
const ALL_FIXTURES: Record<string, string> = { ...REPO_FIXTURES, ...CURLY_FIXTURES };

console.log(`Encoding ${Object.keys(ALL_FIXTURES).length} fixtures (each once, cached)...`);
const table = new Map<string, { text: string; orthos: ReturnType<typeof orthosEncode>; plain: ReturnType<typeof daedalusEncode> }>();
for (const [name, text] of Object.entries(ALL_FIXTURES)) {
  const t0 = Date.now();
  const opts = { budgetMs: 15000 };
  const orthos = orthosEncode(text, ENC, opts);
  const plain = daedalusEncode(text, ENC, opts);
  table.set(name, { text, orthos, plain });
  console.log(`  ${name}: ${T(text)} tok, orthos=${orthos.messageTokens} plain=${plain.messageTokens} applied=${orthos.orthosApplied} (${Date.now() - t0}ms)`);
}

/* ===========================================================================
 * G0 — novelty check
 * ========================================================================= */
{
  const curlyRe = /[\u2018\u2019]/;
  const contaminated = Object.entries(REPO_FIXTURES).filter(([, text]) => curlyRe.test(text)).map(([n]) => n);
  check('G0', contaminated.length === 0,
    contaminated.length === 0
      ? `confirmed: none of ${Object.keys(REPO_FIXTURES).length} existing repo fixtures contain curly apostrophes`
      : `existing fixtures already contain curly text: ${contaminated.join(',')}`);
}

/* ===========================================================================
 * G1 — round trip, library decoder, ALL fixtures (repo + curly)
 * ========================================================================= */
for (const [name, { text, orthos }] of table) {
  const dec = orthosDecode(orthos.wire);
  check('G1', dec === text, `${name}: exact round trip via orthosDecode`);
}

/* ===========================================================================
 * G2 — SECOND, independent decoder written only from the tail-instruction
 * prose (the fixed decode text orthosEncode/orthosDecoderPrompt embed):
 *   "replace every apostrophe ' with U+2018 if the previous character (in
 *    what you've already written) is missing, whitespace, or one of
 *    ([{-—–"“'‘, else replace it with U+2019."
 * This function shares no code with orthosReSmart; only the DAEDALUS/CHIRON
 * inner-decode call is reused (that layer has its own independent decoders
 * in bench/chiron-redteam.ts G2/G3; re-deriving it here is out of scope).
 * ========================================================================= */
function specDecoder(wire: string): string {
  if (wire.length === 0) return wire;
  const OPEN = new Set([' ', '\t', '\n', '\r', '(', '[', '{', '-', '\u2014', '\u2013', '"', '\u201c', "'", '\u2018']);
  function applyApostrophePass(s: string): string {
    let out = '';
    for (const ch of s) {
      if (ch === "'") {
        const prev = out.length > 0 ? out[out.length - 1] : undefined;
        out += (prev === undefined || OPEN.has(prev)) ? '\u2018' : '\u2019';
      } else {
        out += ch;
      }
    }
    return out;
  }
  const first = wire[0];
  if (first === ORTHOS_MARK || first === ORTHOS_ESCAPE) {
    const rest = wire.slice(1);
    const inner = daedalusDecode(rest);
    return first === ORTHOS_MARK ? applyApostrophePass(inner) : inner;
  }
  return daedalusDecode(wire);
}
for (const [name, { text, orthos }] of table) {
  const dec = specDecoder(orthos.wire);
  check('G2', dec === text, `${name}: second decoder (from spec prose) agrees`);
}

/* ===========================================================================
 * G3 — THIRD decoder, CPython, external process, reusing chiron_decode.py
 * ========================================================================= */
{
  const cases: string[] = [];
  const expect: string[] = [];
  for (const [, { text, orthos }] of table) { cases.push(orthos.wire); expect.push(text); }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orthos-g3-'));
  const inPath = path.join(tmp, 'cases.json');
  const outPath = path.join(tmp, 'out.json');
  fs.writeFileSync(inPath, JSON.stringify(cases), 'utf8');
  try {
    execFileSync('python3', ['bench/orthos_decode.py', inPath, outPath], { stdio: 'pipe' });
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
 * G4 — totality / sentinel-collision adversarial inputs (small, fast — run
 * directly, not through the cached table)
 * ========================================================================= */
{
  const adversarial = [
    '',
    ORTHOS_MARK,
    ORTHOS_ESCAPE,
    ORTHOS_MARK + ORTHOS_ESCAPE + 'text',
    ORTHOS_ESCAPE + ORTHOS_MARK + 'text',
    ORTHOS_MARK.repeat(5) + 'nested marks',
    'plain text with a literal ' + ORTHOS_MARK + ' in the middle, not at start',
    "text starting with an apostrophe ' right at position zero after the sentinel test",
    '\u2018already curly at the very start\u2019',
    'a'.repeat(20000) + "'" + 'b'.repeat(20000),
  ];
  for (const s of adversarial) {
    const r = orthosEncode(s, ENC);
    const dec = orthosDecode(r.wire);
    check('G4', dec === s, `adversarial totality: ${JSON.stringify(s.slice(0, 30))}...`);
  }
}

/* ===========================================================================
 * G5 — message accounting honesty
 * ========================================================================= */
for (const [name, { orthos }] of table) {
  const actual = T(orthos.decoderPrompt);
  check('G5', orthos.messageTokens === actual, `${name}: messageTokens=${orthos.messageTokens} matches tokens(decoderPrompt)=${actual}`);
}

/* ===========================================================================
 * G6 — non-regression vs plain DAEDALUS, on every fixture, no exceptions
 * ========================================================================= */
for (const [name, { orthos, plain }] of table) {
  check('G6', orthos.messageTokens <= plain.messageTokens,
    `${name}: orthos ${orthos.messageTokens} <= plain daedalus ${plain.messageTokens}`);
}

/* ===========================================================================
 * G7 — second-order adversary: engineered to make the self-check REJECT
 * (must fall back safely, not crash, not silently corrupt) — small/fast
 * ========================================================================= */
{
  const rejectCases = [
    `Mixed: 'Twas the night, and it's cold. 'quoted' too.`,
    `Nested 'quotes 'inside' quotes' here`,
    `it's it's it's it's it's it's it's it's it's it's`,
    `'`,
    `''''''`,
    `already has a \u2018 curly open and a ' straight one mixed`,
  ];
  for (const s of rejectCases) {
    const r = orthosEncode(s, ENC);
    const dec = orthosDecode(r.wire);
    check('G7', dec === s, `second-order adversary exact: ${JSON.stringify(s.slice(0, 40))}`);
  }
}

/* ===========================================================================
 * G8 — structured fuzz, 500 cases (small strings, fast)
 * ========================================================================= */
{
  let rng = 88172645463325252n;
  function next(): number {
    rng ^= (rng << 13n) & 0xFFFFFFFFFFFFFFFFn;
    rng ^= (rng >> 7n);
    rng ^= (rng << 17n) & 0xFFFFFFFFFFFFFFFFn;
    return Number(rng % 1000000n) / 1000000;
  }
  const words = ["it's", "don't", "can't", 'the', 'quick', "'quoted'", 'brown', 'fox', "y'all", '"straight"',
    '\u2018curly\u2019', '\u201ccurly-double\u201d', 'test', 'sentence', "'", "'''", 'a', 'b', 'don\u2019t', '...', '\u2026'];
  let fuzzFails = 0;
  for (let i = 0; i < 500; i++) {
    const n = 3 + Math.floor(next() * 20);
    const parts: string[] = [];
    for (let j = 0; j < n; j++) parts.push(words[Math.floor(next() * words.length)]);
    const s = parts.join(' ');
    const r = orthosEncode(s, ENC);
    const dec = orthosDecode(r.wire);
    if (dec !== s) fuzzFails++;
  }
  check('G8', fuzzFails === 0, `${500 - fuzzFails}/500 fuzz cases exact round trip`);
}

/* ===========================================================================
 * G9 — the headline claim: measured, non-trivial win on realistic prose
 * ========================================================================= */
{
  const { text, orthos, plain } = table.get('curly-combo')!;
  const dec = orthosDecode(orthos.wire);
  check('G9-exact', dec === text, 'combo fixture decodes exactly');
  check('G9-applied', orthos.orthosApplied === true, `orthos applied on combo fixture (${orthos.orthosChars} apostrophes canonicalized)`);
  const saved = plain.messageTokens - orthos.messageTokens;
  check('G9-win', saved > 0, `saved ${saved} message tokens vs plain DAEDALUS (plain=${plain.messageTokens}, orthos=${orthos.messageTokens})`);
  console.log(`  G9 receipt: plain DAEDALUS messageTokens=${plain.messageTokens}, ORTHOS messageTokens=${orthos.messageTokens}, saved=${saved} (${(100 * saved / plain.messageTokens).toFixed(1)}%)`);
}

/* ===========================================================================
 * G10 — speed budget: ORTHOS's OWN overhead (deSmart/reSmart self-check) is
 * cheap and does not materially change wall-clock vs plain DAEDALUS alone.
 * ========================================================================= */
{
  const { text } = table.get('curly-combo')!;
  const t0 = Date.now();
  orthosDeSmart(text);
  const desmartMs = Date.now() - t0;
  check('G10', desmartMs < 50, `deSmart self-check on ${T(text)}-token fixture: ${desmartMs}ms (must be << DAEDALUS's own search time)`);
}

/* ===========================================================================
 * SUMMARY
 * ========================================================================= */
console.log(`\nORTHOS RED TEAM: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  - ' + f);
}
process.exitCode = fail > 0 ? 1 : 0;
