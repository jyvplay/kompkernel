import { countTokens } from '@/lib/omega/bpe';
const cands = [
  '8-digit runs that are valid dates become YYYY-MM-DD.',
  '8-digit runs starting 19 or 20 that are valid dates become YYYY-MM-DD.',
  '8-digit runs beginning 19 or 20, if a valid date, become YYYY-MM-DD.',
  '8-digit runs starting with 19 or 20 that are valid dates become YYYY-MM-DD.',
  '8-digit runs from 19xx or 20xx that are valid dates become YYYY-MM-DD.',
  'An 8-digit run is YYYY-MM-DD if it starts 19 or 20 and is a valid date.',
  '8-digit runs that start 19 or 20 and are valid dates become YYYY-MM-DD.',
];
for (const c of cands) console.log(String(countTokens(c, 'o200k_base')).padStart(3), c);
