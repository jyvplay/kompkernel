import { countTokens } from '@/lib/omega/bpe';
const variants: Array<[string,string]> = [
  ['A', 'Digit runs are packed: restore the separators of 9999-99-99 and 99:99:99.999999999 in every digit run of the same digit count (9 = a digit).'],
  ['B', 'Packed digits: a run of 8 digits is 9999-99-99, a run of 15 is 99:99:99.999999999; put the separators back.'],
  ['C', 'Expand digit runs by shape (9=digit): 8=9999-99-99, 15=99:99:99.999999999.'],
  ['D', 'Digit runs, by digit count: 8\u2192 9999-99-99, 15\u2192 99:99:99.999999999.'],
  ['E', 'Insert the separators back into digit runs: 9999-99-99 (8), 99:99:99.999999999 (15).'],
  ['F', 'Unpack digit runs: 9999-99-99, 99:99:99.999999999 (9=digit, match by count).'],
  ['G', 'Digits run together; split them as 9999-99-99 and 99:99:99.999999999.'],
  ['H', 'Date/time digits: 8 digits = YYYY-MM-DD, 15 = HH:MM:SS.ffffff.'],
  ['I', 'Split digit runs: 8\u2192YYYY-MM-DD, 15\u2192HH:MM:SS.ffffff.'],
];
for (const [k,v] of variants) console.log(k, String(countTokens(v,'o200k_base')).padStart(4), String(countTokens(v,'cl100k_base')).padStart(4), v);
// per-shape marginal cost of appending one more shape to variant F-style
const base = 'Unpack digit runs: 9999-99-99 (9=digit, match by count).';
const two  = 'Unpack digit runs: 9999-99-99, 99:99:99.999999999 (9=digit, match by count).';
console.log('marginal 1 shape', countTokens(base,'o200k_base'), '2 shapes', countTokens(two,'o200k_base'));
