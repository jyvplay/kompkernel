import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const cands = [
  // aggressive compact but still naming: glossary/list before the mark, body after, repeat, output-only
  'Expand the ¶-glossary into the text after it, repeatedly. Print only the result.',
  'Glossary before ¶; text after. Expand repeatedly. Print only the result.',
  'Use the glossary before ¶ to expand the text after it, repeatedly. Print only the result.',
  'The glossary before ¶ defines letters. Expand the rest repeatedly. Print only the result.',
  'Expand the text after ¶ with the glossary before it, repeatedly. Print only the result.',
  'Substitute the ¶-glossary into the rest, repeatedly. Print only the result.',
  'Apply the ¶-glossary to the text after it, repeatedly. Print only the result.',
  'Glossary then text, split by ¶. Expand repeatedly. Print only the result.',
  'Before ¶: glossary. After ¶: expand repeatedly. Print only the result.',
  'Expand with the glossary, repeatedly. Print only the result.',
  'Expand using the glossary, repeatedly. Print only the result.',
  'Substitute the glossary repeatedly. Print only the result.',
  'Expand the letters by the glossary, repeatedly. Print only the result.',
  'Expand every letter with the glossary, repeatedly. Print only the result.',
  'Expand each letter via the glossary, repeatedly. Print only the result.',
  'Expand per the glossary, repeatedly. Print only the result.',
  'Expand the glossary repeatedly. Print only the result.',
  'Expand abbreviations repeatedly. Print only the result.',
  'Expand the letters repeatedly. Print only the result.',
  'Expand all letters repeatedly. Print only the result.',
  'Replace letters by the glossary repeatedly. Print only the result.',
  // non-nested variants (no "repeatedly")
  'Expand the ¶-glossary into the text after it. Print only the result.',
  'Use the glossary before ¶ to expand the text after it. Print only the result.',
  'Expand with the glossary. Print only the result.',
  'Expand the letters by the glossary. Print only the result.',
  'Expand each letter via the glossary. Print only the result.',
  'Substitute the glossary. Print only the result.',
  'Expand the letters. Print only the result.',
];
const rows = cands.map(c => [T(c), c] as [number, string]).sort((a,b)=>a[0]-b[0]);
for (const [n,c] of rows) console.log(String(n).padStart(3), c);
console.log('\nCURRENT =', T('Before ¶ new foreign letters name text to the next. After ¶ expand repeatedly; print result only.'));
