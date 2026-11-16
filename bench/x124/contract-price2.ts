import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const V = [
  'After ‡0,56,74,86: 26 rows, single-spaced; put field k at the k-th offset.',
  '‡0,56,74,86: the 26 rows below are single-spaced — put field k at the k-th offset, then drop this line.',
  '‡0,56,74,86 — rows below are single-spaced; place field k at the k-th offset. Drop this line.',
  'Rows after ‡ are single-spaced: put field k at offset k of 0,56,74,86. Drop this line.',
  '‡: rows are single-spaced; field k goes at the k-th offset (0,56,74,86). Drop this line.',
  '‡0,56,74,86: rows below, single-spaced, field k at the k-th offset. Drop this line.',
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
