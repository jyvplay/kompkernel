import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const o = '0,56,74,86';
const w = '56,18,12';
const V = [
  `‡${w}:26 rows single-spaced, pad field k to width k, split right.`,
  `‡${w}:26 rows single-spaced, pad field k to width k, right-split.`,
  `‡${w}:26 rows single-spaced, pad field k to width k, split from the right.`,
  `‡${w}:26 rows single-spaced, pad field k to width k; field 0 keeps its spaces.`,
  `‡${w}:26 rows single-spaced, pad field k to width k; column 0 may contain spaces.`,
  `‡${o}:26 rows single-spaced, field k at offset k, split right.`,
  `‡${o}:26 rows single-spaced, field k at offset k, right-split.`,
  `‡${o}:26 rows single-spaced, field k at offset k, tail split.`,
  `‡${o}:26 rows, single-spaced, field k at offset k, split right.`,
  `‡${o}:26 rows single-spaced; field k at offset k; split right.`,
  `‡${o}:26 rows single-spaced; field k at offset k.`,
  `‡${w}:26 rows single-spaced, pad field k to width k.`,
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
