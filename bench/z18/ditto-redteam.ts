// DITTO-F1 red team: edge cases + seeded fuzz. Each case must round-trip exactly; gates must return identity where they should.
import { dittoEncode, dittoDecode, DITTO_RULE } from '@/lib/omega/ditto';
const cases: [string, string][] = [
  ['empty', ''],
  ['single line', 'a bb ccc'],
  ['no repeats', 'x 1 y\nz 2 w'],
  ['same record repeated', 'alpha beta gamma\nalpha beta gamma\nalpha beta gamma'],
  ['literal caret in input (escaped)', 'alpha beta\nalpha ^x'],
  ['literal lone caret fields', '^ ^ ^^\n^ ^ ^^\n^ ^ ^^'],
  ['caret-leading repeated field (escaped and marked)', '^ver ^ver\n^ver ^ver'],
  ['semver ranges (npm-like)', '"^7.0.0"\n"^7.0.0"\n"^7.0.0"'],
  ['header-like input', DITTO_RULE + '\nalpha beta gamma\nalpha beta gamma'],
  ['header-like without caret', 'DITTO: rule\nalpha beta gamma\nalpha beta gamma'],
  ['escape header input', 'DITTO: identity\nalpha beta gamma\nalpha beta gamma'],
  ['CRLF', 'alpha beta gamma\r\nalpha beta gamma\r\n'],
  ['double spaces (empty fields)', 'a  bbb  ccc\na  bbb  ccc'],
  ['leading and trailing spaces', ' bbbb cccc \n bbbb cccc '],
  ['tabs are not separators', 'a\tbbbb\tcccc\na\tbbbb\tcccc'],
  ['min length boundary (len 2 unmarked, len 3 marked)', 'ab cde fg\nab cde fg'],
  ['trailing newline', 'aaa bbb\naaa bbb\n'],
  ['empty lines between', 'aaa bbb\n\naaa bbb'],
  ['field shift changes positions', 'x yyyy zzzz\nyyyy zzzz x\nx yyyy zzzz'],
  ['unicode fields', 'ö日本 語語語\nö日本 語語語'],
  ['first line only has repeats of nothing', 'aaaa\naaaa\naaaa'],
  ['very long repeated field', 'L'.repeat(4000) + ' end\n' + 'L'.repeat(4000) + ' end'],
  ['all-empty lines', '\n\n\n'],
];
let fails = 0;
for (const [name, text] of cases) {
  const r = dittoEncode(text, 'o200k_base');
  const ok = dittoDecode(r.wire) === text && r.decoded === text;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} mode=${r.mode.padEnd(8)} marked=${r.marked} in=${r.inTokens} out=${r.outTokens}`);
}
let s = 424242 >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const words = ['a', 'bb', 'ccc', 'dddd', 'eeeee', '', '/x/y', 'Z9', 'ö', '2026-10-11', '12:00:01.250'];
let fuzzFails = 0, fuzzMarked = 0;
for (let k = 0; k < 3000; k++) {
  const n = 1 + Math.floor(rnd() * 25);
  const cols = 1 + Math.floor(rnd() * 6);
  const prevLine: string[] = [];
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const f: string[] = [];
    for (let j = 0; j < cols; j++) f.push(rnd() < 0.6 && prevLine[j] !== undefined ? prevLine[j] : words[Math.floor(rnd() * words.length)]);
    prevLine.length = 0; prevLine.push(...f);
    lines.push(f.join(rnd() < 0.1 ? '  ' : ' '));
  }
  const text = lines.join('\n') + (rnd() < 0.2 ? '\n' : '');
  const r = dittoEncode(text, 'o200k_base');
  if (r.mode === 'ditto') fuzzMarked++;
  if (dittoDecode(r.wire) !== text || r.decoded !== text) fuzzFails++;
}
console.log(`fuzz: 3000 record sets, decode fails=${fuzzFails}, sets that used the ditto path=${fuzzMarked}`);
console.log(fails === 0 && fuzzFails === 0 ? 'ALL EXACT' : `FAILURES: cases=${fails} fuzz=${fuzzFails}`);
