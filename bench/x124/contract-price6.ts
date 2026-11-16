import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const o = '0,56,74,86', o2 = '2,30';
const V = [
  `‡${o}:26 rows below are single-spaced; field k starts at offset k.`,
  `‡${o}:26 rows below are single-spaced; field k starts at offset k, split from the right.`,
  `‡${o}:26 rows below are single-spaced; field k begins at offset k.`,
  `‡${o}:26 rows below are single-spaced; column k starts at offset k.`,
  `‡${o2}:6 rows below are single-spaced; field k starts at offset k.`,
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
