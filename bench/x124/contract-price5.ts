import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const wid = '56,18,12';
const V = [
  `‡${wid}:26 rows below, single-spaced, pad field k to width k.`,
  `‡${wid}:26 rows below, single-spaced, pad field k to width k, split from the right.`,
  `‡${wid}:26 rows below are single-spaced; pad field k to width k.`,
  `‡${wid}: pad field k to width k in the 26 single-spaced rows below.`,
  `‡${wid}: next 26 rows single-spaced; pad field k to width k.`,
  `‡${wid}: next 26 rows single-spaced; pad field k to width k, split from the right.`,
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
