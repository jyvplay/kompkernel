// X15: o200k token cost of a raw digit run vs its DIAPHORA mark (∆ + signed delta), by digit length of the raw
// number and digit length of the delta. Measured with the repo's own o200k counter (countTokens).
import { countTokens } from '@/lib/omega/bpe';
const out: any[] = [];
for (const rawLen of [4, 5, 6, 7, 8, 9, 10, 12]) {
  const raw = '1' + '3'.repeat(rawLen - 1);
  const rawT = countTokens(raw, 'o200k_base');
  const row: any = { rawDigits: rawLen, rawTokens: rawT };
  for (const dLen of [1, 2, 3, 4, 6]) {
    const d = '7' + '4'.repeat(dLen - 1);
    row[`mark_d${dLen}`] = countTokens('∆' + d, 'o200k_base');
    row[`mark_neg_d${dLen}`] = countTokens('∆-' + d, 'o200k_base');
  }
  out.push(row);
}
console.log(JSON.stringify({ mark_alone: countTokens('∆', 'o200k_base') }));
for (const r of out) console.log(JSON.stringify(r));
