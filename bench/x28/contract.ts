import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const cands = [
  // current SYMPLOKE base
  'Before ¶ new foreign letters name text to the next. After ¶ expand repeatedly; print result only.',
  // progressively terser
  'Before ¶, each foreign letter names the text after it. After ¶, expand repeatedly. Print only the result.',
  'Letters before ¶ name the phrases after them. Expand the rest repeatedly; print only it.',
  'Each letter before ¶ names the text following it. Expand the text after ¶ repeatedly. Output only that.',
  'A letter before ¶ names the text after it. Expand the last section fully; print only it.',
  'In part one each letter names the next phrase. Expand part two repeatedly. Print only part two.',
  'Key: each letter = the phrase after it. Expand the body repeatedly; print only the result.',
  'The glossary: a letter names the phrase beside it. Expand the message repeatedly; print only it.',
  'Letters name the phrases beside them. Expand the rest again and again. Print only the result.',
  'Letter = phrase. Expand the final block repeatedly. Print only it.',
  'Expand each letter using the list. Repeat until none remain. Print only the result.',
  'Substitute the letters using the list, repeatedly. Print only the result.',
  'Expand; print only the result.',
  'Substitute repeatedly and print only the result.',
  'Expand all abbreviations and print only the result.',
  'Undo the abbreviations. Print only the result.',
  'Decode and print only the result.',
  'Expand. Print only the result.',
  'Decode. Output text only.',
  'Expand. Output only.',
  'Expand, print only.',
  'Decode.',
];
for (const c of cands) console.log(String(T(c)).padStart(3), c);
