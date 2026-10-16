// X19: token cost of candidate STIGME contract wordings.
import { encode } from 'gpt-tokenizer';
const T = (s) => encode(s).length;

const variants = [
  ['A long', 'Digit groups are written without their inner punctuation. In the printed result, restore it: 8 digits = 4-2-2 joined by "-" (20260930 -> 2026-09-30). 16 digits after the mark = 2-2-2-10 joined by ":" ":" "." (0759526403938810 -> 07:59:52.6403938810). A run followed by the mark keeps its digits.'],
  ['B terse', 'Nums lose inner punctuation; restore in the result: 8d = 4-2-2 "-" (20260930 = 2026-09-30). Marked 16d = 2-2-2-10 ":" ":" "." . A run + mark keeps its digits.'],
  ['C mid',   'Digit groups lose their inner punctuation; restore it in the result: 8 digits = 4-2-2 with "-" (20260930 = 2026-09-30). 16 digits after the mark = 2-2-2-10 with ":" ":" "." . A run followed by the mark is left as it is.'],
];
for (const [n, s] of variants) console.log(T(s).toString().padStart(4), n);

console.log('\n--- pieces ---');
const pieces = [
  'Digit groups are written without their inner punctuation.',
  'Digit groups lose their inner punctuation.',
  'Nums lose inner punctuation.',
  'Restore it in the result:',
  'In the printed result, restore it:',
  '8 digits = 4-2-2 joined by "-"',
  '8 digits = 4-2-2 with "-"',
  '8d = 4-2-2 "-"',
  '(20260930 = 2026-09-30)',
  '(20260930 -> 2026-09-30)',
  '16 digits after the mark = 2-2-2-10 joined by ":" ":" "."',
  '16d marked = 2-2-2-10 ":" ":" "."',
  'A run followed by the mark keeps its digits.',
  'A run + mark keeps its digits.',
];
for (const p of pieces) console.log(T(p).toString().padStart(4), JSON.stringify(p));

console.log('\n--- marker glyph candidates (1 token each?) ---');
for (const c of ['␟', '␡', '␞', '⌁', '⌸', '⍭', '✦', '✧', '❖', '◈', '⟡', '⁘', '⁙', '⁚', '⸮', 'ↂ']) {
  console.log(T(c), JSON.stringify(c), c.codePointAt(0).toString(16));
}
