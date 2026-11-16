import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const V = [
  '‡0,56,74,86: rows below single-spaced; field k at offset k.',
  '‡0,56,74,86 rows single-spaced, field k at offset k.',
  '‡ 0,56,74,86: field k at offset k (rows single-spaced).',
  'field k at offset k of 0,56,74,86; rows below are single-spaced.',
  '‡0,56,74,86: k-th field at k-th offset; rows single-spaced.',
  '‡0,56,74,86 space-separated: k-th field starts at the k-th offset.',
  '‡0,56,74,86: fields joined by one space; k-th field starts at offset k.',
  'Widths 56,18,12: rows below are single-spaced; pad field k to width k.',
  '‡56,18,12: rows below single-spaced, pad field k to width k.',
];
for (const v of V) console.log(String(countTokens(v + '\n', enc)).padStart(3), v);
