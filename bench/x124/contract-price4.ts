import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const offs = '0,56,74,86';
const wid = '56,18,12';
const V = [
  `‡${offs}:26 rows single-spaced, field k at offset k.`,
  `‡${offs}:26 rows single-spaced, field k at offset k, split from the right.`,
  `‡${offs}:26 rows single-spaced, field k at offset k, split right.`,
  `‡${wid}:26 rows single-spaced; pad field k to width k.`,
  `‡${wid}:26 rows single-spaced; pad field k to width k, split from the right.`,
  `‡${wid}:26 rows, single-spaced; pad field k to width k.`,
  `‡${wid}:26 rows single-spaced, pad field k to width k.`,
  `‡${wid}:26 rows, one space between fields; pad field k to width k.`,
  `‡${wid} pad field k of the next 26 rows to width k; they are single-spaced.`,
  `‡${wid}: the 26 rows below are single-spaced; pad field k to width k.`,
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
const M = ['‡','¤','※','°','µ','¦','†','◊','◈','⬦','§','¶','ø','¢','€','¥','⊙','⊕','⊗','⊘'];
console.log('one-token markers:', M.filter((m) => countTokens(m, enc) === 1).join(' '));
