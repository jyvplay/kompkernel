// X19: token cost of STIGME contract wordings (measured, o200k).
import { encode } from 'gpt-tokenizer';
const T = (s) => encode(s).length;

const bases = [
  'Digit groups are written with the punctuation inside them removed; in the printed result restore it:',
  'Digit groups drop the punctuation inside them; restore it in the printed result:',
  'Nums drop inner punctuation; restore it in the result:',
  'Numbers lose the punctuation inside them; in the result put it back:',
  'Punctuation inside numbers is dropped; restore it in the result:',
];
for (const b of bases) console.log(T(b).toString().padStart(3), b);

const shapes = [
  ['A full',        ' 8 digits = 4-2-2 joined by "-" (20260930 = 2026-09-30).'],
  ['B with',        ' 8 digits = 4-2-2 with "-" (20260930 = 2026-09-30).'],
  ['C terse d',     ' 8d = 4-2-2 "-" (20260930 = 2026-09-30).'],
  ['D example only',' 8 digits like 20260930 = 2026-09-30.'],
  ['E ex only bare',' 20260930 = 2026-09-30.'],
  ['F shape+ex',    ' 4-2-2 "-" (20260930 = 2026-09-30).'],
  ['G colon',       ' 8:4-2-2"-"(20260930=2026-09-30).'],
];
for (const [n, s] of shapes) console.log(T(s).toString().padStart(3), n, JSON.stringify(s));

console.log('\nmulti-separator examples:');
const multi = [
  ' 16 digits = 2-2-2-10 with ":" ":" "." (0759526403938810 = 07:59:52.6403938810).',
  ' 16d = 2-2-2-10 ":" ":" "." (0759526403938810 = 07:59:52.6403938810).',
  ' 18 digits = 4-2-2-2-8 with "-" "," "." (199001021724000017240000 = 1990-01-02,17.240000,17.240000).',
  ' 6 digits like 000205 = 00:02:05.',
  ' 3 digits like 121 = 1.2.1.',
];
for (const s of multi) console.log(T(s).toString().padStart(3), JSON.stringify(s));

console.log('\nfull contracts:');
const fulls = [
  ['P1', 'Nums drop inner punctuation; restore it in the result: 8 digits = 4-2-2 with "-" (20260930 = 2026-09-30).'],
  ['P2', 'Nums drop inner punctuation; restore it in the result: 8d = 4-2-2 "-" (20260930 = 2026-09-30).'],
  ['P3', 'Nums drop inner punctuation; restore it in the result: 8 digits like 20260930 = 2026-09-30.'],
  ['P4', 'Numbers lose the punctuation inside them; in the result put it back: 8 digits = 4-2-2 with "-" (20260930 = 2026-09-30).'],
];
for (const [n, s] of fulls) console.log(T(s).toString().padStart(3), n);
console.log('\ntwo-shape:');
console.log(T('Nums drop inner punctuation; restore it in the result: 8 digits = 4-2-2 with "-" (20260930 = 2026-09-30). 16 digits = 2-2-2-10 with ":" ":" "." (0759526403938810 = 07:59:52.6403938810).'), 'P1+2');
console.log(T('Nums drop inner punctuation; restore it in the result: 8d = 4-2-2 "-" (20260930 = 2026-09-30). 16d = 2-2-2-10 ":" ":" "." (0759526403938810 = 07:59:52.6403938810).'), 'P2+2');
console.log('\nescape clause:');
console.log(T('A digit run followed by ␡ keeps its digits and the ␡ is deleted.'));
for (const c of ['\u03b1','\u03b2','\u0561','\u10d0','\u30cd','\u0410','\u2726','\u25c8']) console.log(T(c), JSON.stringify(c));
