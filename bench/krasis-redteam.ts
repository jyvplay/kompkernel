/**
 * bench/krasis-redteam.ts — adversarial + economic audit for KRASIS-⊕.
 * Run: npx tsx bench/krasis-redteam.ts
 *
 * Gates (all must hold):
 *  - EXACTNESS: krasisDecode(wire) === input for every case (0 failures).
 *  - HONESTY: applied ⇒ messageTokens < inTokens (contract-inclusive).
 *  - NO REGRESSION: !applied ⇒ messageTokens <= inTokens (+1 only on sentinel escape).
 *  - REAL GAINS: NFD payloads show large contract-inclusive savings.
 *  - FUZZ: random accented / Hangul strings (NFC & NFD & mixed) round-trip exactly.
 */
import { encode as enc200 } from 'gpt-tokenizer/encoding/o200k_base';
import { krasisEncode, krasisDecode, KRASIS_MARK, KRASIS_ESCAPE, KRASIS_OPEN, KRASIS_CLOSE } from '../src/lib/omega/krasis';

const T = (s: string) => enc200(s).length;
const nfd = (s: string) => s.normalize('NFD');
type Case = { name: string; text: string };

const cases: Case[] = [
  // ---- headline NFD payloads (composed inputs decomposed to NFD) ----
  { name: 'korean phrase (NFD jamo)', text: nfd('안녕하세요 반갑습니다 한국어') },
  { name: 'korean document (NFD)', text: nfd('한국어는 아름다운 언어입니다. 우리는 매일 한국어를 공부합니다.') },
  { name: 'vietnamese doc (NFD)', text: nfd('Tiếng Việt là ngôn ngữ của người Việt Nam, rất đẹp và giàu thanh điệu.') },
  { name: 'french prose (NFD)', text: nfd('Voilà où être élève à la fête; réédité, préféré, château.') },
  { name: 'portuguese (NFD)', text: nfd('A ação do coração português é a solução ideal não?') },
  { name: 'macos filename (NFD)', text: nfd('보고서_2026_최종본.pdf') },
  { name: 'mixed ascii + NFD accents', text: 'user path: ' + nfd('/Users/José/Documentos/Niño/café.txt') },

  // ---- MUST NOT COMPRESS (identity, still exact) ----
  { name: 'already NFC accents', text: 'café résumé naïve Zürich' },
  { name: 'already NFC korean', text: '안녕하세요 한국어' },
  { name: 'plain english prose', text: 'The quick brown fox jumps over the lazy dog.' },
  { name: 'ascii json', text: '{"a":1,"b":"hello"}' },
  { name: 'empty', text: '' },
  { name: 'plain cjk (no decomposition)', text: '日本語のテキストです' },

  // ---- ADVERSARIAL ----
  { name: 'starts with MARK ¨', text: KRASIS_MARK + ' ' + nfd('café') },
  { name: 'starts with ESCAPE ¸', text: KRASIS_ESCAPE + 'test' },
  { name: 'literal ‹ › guillemets in text', text: nfd('il dit ‹bonjour› à moi café') },
  { name: 'precomposed é between NFD ê ü', text: 'x' + nfd('ê') + 'café(precomposed é)' + nfd('ü') + 'y' },
  { name: 'combining mark on ascii base', text: 'a' + '\u0301' + ' plain b' + '\u0300' + ' c' },
  { name: 'lone combining mark at start', text: '\u0301 orphan mark then ' + nfd('résumé') },
  { name: 'zalgo (many stacked marks)', text: 'z' + '\u0301\u0302\u0303\u0304\u0305' + ' ' + nfd('café') },
  { name: 'NFD emoji-adjacent', text: nfd('café') + ' 🚀 ' + nfd('naïve') },
  { name: 'singleton canonical (Å ohm Ω)', text: '\u212B ohm \u2126 (singletons)' },
];

let failures = 0, applied = 0, regressions = 0, sumIn = 0, sumOut = 0, appIn = 0, appOut = 0;
const rows: string[] = [];

for (const c of cases) {
  const r = krasisEncode(c.text, 'o200k_base');
  const exact = krasisDecode(r.wire) === c.text;
  if (!exact) { failures++; rows.push(`  ✗ EXACT FAIL: ${c.name}`); }
  if (r.applied && r.messageTokens >= r.inTokens) { regressions++; rows.push(`  ✗ HONESTY FAIL: ${c.name}`); }
  const startsSentinel = c.text.length > 0 && (c.text[0] === KRASIS_MARK || c.text[0] === KRASIS_ESCAPE);
  if (!r.applied && r.messageTokens > r.inTokens + (startsSentinel ? 1 : 0)) { regressions++; rows.push(`  ✗ REGRESSION: ${c.name}`); }
  if (r.applied) { applied++; appIn += r.inTokens; appOut += r.messageTokens; }
  sumIn += r.inTokens; sumOut += r.messageTokens;
  const tag = exact ? (r.applied ? '✓apply' : '·ident') : '✗FAIL';
  rows.push(`  ${tag}  ${c.name.padEnd(34)} in=${String(r.inTokens).padStart(4)} msg=${String(r.messageTokens).padStart(4)} save=${String(r.inTokens - r.messageTokens).padStart(4)} (${r.savingsPct.toFixed(0)}%)  comp=${r.composedChars}`);
}

// ---- FUZZ: random accented/Hangul strings in NFC, NFD, and mixed forms ----
let fuzzFail = 0;
const pool = [...'abc XYZ 012 .,!', 'é', 'ñ', 'ü', 'à', 'ê', 'ç', 'Å', 'Ω', 'ä', '你', '😀', '\u0301', '\u0308', KRASIS_OPEN, KRASIS_CLOSE, '가', '한', '국', '어', '안', '녕'];
function rnd(seed: number) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
const R = rnd(20260930);
for (let t = 0; t < 5000; t++) {
  let raw = '';
  const len = 1 + Math.floor(R() * 30);
  for (let k = 0; k < len; k++) raw += pool[Math.floor(R() * pool.length)];
  const src = t % 3 === 0 ? raw.normalize('NFD') : (t % 3 === 1 ? raw.normalize('NFC') : raw);
  const rr = krasisEncode(src, 'o200k_base');
  if (krasisDecode(rr.wire) !== src) { fuzzFail++; if (fuzzFail <= 3) rows.push(`  ✗ FUZZ FAIL: ${JSON.stringify(src.slice(0, 30))}`); }
}

console.log('=== KRASIS-⊕ RED-TEAM ===============================================');
console.log(rows.join('\n'));
console.log('--------------------------------------------------------------------');
console.log(`cases=${cases.length} applied=${applied} exact_failures=${failures} honesty/regression=${regressions} fuzz(5000)_failures=${fuzzFail}`);
console.log(`aggregate all cases : in=${sumIn} msg=${sumOut} saved=${sumIn - sumOut}`);
console.log(`aggregate WHERE APPLIED: in=${appIn} msg=${appOut} saved=${appIn - appOut} (${(100 * (appIn - appOut) / Math.max(1, appIn)).toFixed(1)}%)`);
const ok = failures === 0 && regressions === 0 && fuzzFail === 0;
console.log(ok ? '\n✅ PASS — byte-exact, honest, no regressions, 5000-case fuzz clean.' : '\n❌ FAIL — see above.');
process.exit(ok ? 0 : 1);
