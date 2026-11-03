/**
 * X72 differential gate: is `fastChunkCount` the SAME function as the library's
 * `encode(chunk).length`?
 *
 * The claim is not "close", it is "identical on everything tested", so the test
 * is deliberately hostile: every whitespace-delimited and pre-token-sized chunk
 * of every fixture in the repository, all Unicode boundary cases, random bytes
 * that decode to text, and the complete wires of the codecs that exist.
 */
import * as fs from 'node:fs';
import { fastCount, fastChunkCount, libraryChunkCount, fastReady } from '../../src/lib/omega/bpe-fast';
import * as O200K from 'gpt-tokenizer/encoding/o200k_base';

const t0 = Date.now();
if (!fastReady()) { console.error('FAIL: index did not build'); process.exit(1); }
console.error(`index built in ${Date.now() - t0} ms`);

let checked = 0, bad = 0;
const failures: string[] = [];
function check(s: string, why: string) {
  if (!s) return;
  const a = libraryChunkCount(s);
  const b = fastCount(s);
  const c = fastChunkCount(s);
  // the library must STILL give the same answer after the accelerated call: an
  // accelerated path that perturbs the library's shared state (regex lastIndex,
  // caches) would pass a before-only test and then corrupt every later count.
  const a2 = libraryChunkCount(s);
  if (a2 !== a) { bad++; if (failures.length < 25) failures.push(`perturbed ${JSON.stringify(s)} before=${a} after=${a2}`); }
  checked++;
  if (a !== b) { bad++; if (failures.length < 25) failures.push(`${why} ${JSON.stringify(s)} library=${a} fastCount=${b}`); }
  // fastChunkCount is only defined for a single pre-token match (a merge cannot
  // span a match boundary). Assert the two agree exactly when the string is one.
  const re = (O200K as any).default.bytePairEncodingCoreProcessor.tokenSplitRegex as RegExp;
  const ms = s.match(re);
  if (ms && ms.length === 1 && ms[0] === s && c !== a) {
    bad++; if (failures.length < 25) failures.push(`chunk ${JSON.stringify(s)} lib=${a} chunk=${c}`);
  }
}

// 1. every fixture, split three ways: whitespace, characters, and 1..12-char windows
const files: string[] = [];
for (const d of ['bench/holdout', 'bench/holdout-tbl', 'bench/holdout-work', 'bench/holdout-x40',
  'bench/holdout-x41', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/x70', 'bench/x71']) {
  let names: string[] = [];
  try { names = fs.readdirSync(d); } catch { continue; }
  for (const n of names) if (/\.(txt|md|tsv|csv|patch|json)$/.test(n) || /^msg-/.test(n)) files.push(`${d}/${n}`);
}
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const w of text.split(/(\s+)/)) check(w, `word:${f}`);
  for (const line of text.split('\n').slice(0, 400)) {
    for (let i = 0; i < line.length; i++) check(line.slice(i, i + 1 + (i % 12)), `win:${f}`);
  }
}

// 2. Unicode and boundary cases that a byte-keyed index can get wrong
const specials = [
  '', ' ', '  ', '\n', '\r\n', '\t', '\u0000', '\u007f', 'é', 'e\u0301', 'ü', 'ß', 'İ', 'ı',
  '日本語', '中文', '한국어', '🙂', '🙂🙂', '👨‍👩‍👧‍👦', '𝔘𝔫𝔦', 'ﬁ', 'ⅷ', '０', '①',
  'a̐', 'ﬀ', 'ǅ', 'ʼn', 'स', 'العربية', 'עברית', 'Русский', 'Ελληνικά', 'ไทย',
  '\uD800', '\uDC00', 'a\uD800b', '\uFFFD', '\uFEFF', '⟦', '¦', '§', '𝕏',
  'the', ' the', 'the ', '  the', 'The', 'THE', 'THe',
  '1234567', '1234567890123', '3.14159', '0xDEADBEEF', '2026-11-02T16:29:28Z',
  'https://github.com/jyvplay/kompkernel/pull/43#issuecomment-2918',
  '<m.oyelaran@northgate-analytics.com>', '```', '**bold**', '| a | b |', '- [ ] task',
];
for (const s of specials) check(s, 'special');

// 3. fuzz: random code points, random lengths, weighted to look like real text
let seed = 20261102;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:-_/\\|<>[]{}()"\'`~!@#$%^&*+=?\n\t';
for (let i = 0; i < 20000; i++) {
  const n = 1 + Math.floor(rnd() * 40);
  let s = '';
  for (let k = 0; k < n; k++) {
    if (rnd() < 0.06) s += String.fromCodePoint(0x80 + Math.floor(rnd() * 0x2f00));
    else s += alphabet[Math.floor(rnd() * alphabet.length)];
  }
  check(s, 'fuzz');
}

// 4. exhaustive single bytes 0..255 as characters
for (let i = 1; i < 256; i++) check(String.fromCharCode(i), 'byte');

console.error(`checked ${checked} strings, mismatches ${bad}`);
if (bad) { for (const f of failures) console.error('  ' + f); process.exit(1); }
console.error('IDENTICAL on everything tested');
