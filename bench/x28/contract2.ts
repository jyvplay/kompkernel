import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const CUR = 'Before ¶ new foreign letters name text to the next. After ¶ expand repeatedly; print result only.';
const groups: Record<string, string[]> = {
  'FULL (tape+map+split+repeat+output)': [
    CUR,
    'Before ¶ a letter names the phrase after it. After ¶ expand repeatedly; print only the result.',
    'Letters before ¶ name the phrases after them. Expand the rest repeatedly. Print only it.',
    'In the ¶-list a letter names the phrase after it. Expand the rest repeatedly; print only it.',
    'A letter before ¶ stands for the text after it. Expand the last part repeatedly; print only it.',
    'Before ¶: letter = the phrase after it. After ¶: expand repeatedly; print only the result.',
    'Each letter before ¶ means the phrase after it. Expand the remainder repeatedly. Print only it.',
    'Letters name the phrases after them; expand the text after ¶ repeatedly. Print only it.',
    'The ¶-list: a letter names the next phrase. Expand the text after it repeatedly. Print only that.',
    'Before ¶ letters label the phrases after them. After ¶ expand repeatedly and print only the result.',
    'A letter before ¶ names the phrase that follows. Expand what follows ¶ repeatedly. Print only it.',
    'Before ¶: each letter names the phrase after it. After ¶ expand it repeatedly; print only the result.',
    'Letters before ¶ name the phrases after them; after ¶ expand repeatedly. Print only the result.',
    'Before ¶, letters name the phrases after them. After ¶, expand repeatedly. Print only the result.',
    'Before ¶ a letter = the phrase after it. After ¶ expand repeatedly and print only the result.',
  ],
  'NO-REPEAT (non-nested tape only)': [
    'Before ¶ a letter names the phrase after it. After ¶ expand; print only the result.',
    'Letters before ¶ name the phrases after them. Expand the rest. Print only it.',
    'Before ¶: letter = the phrase after it. After ¶: expand; print only the result.',
    'A letter before ¶ stands for the text after it. Expand the last part. Print only it.',
    'Letters name the phrases after them; expand the text after ¶. Print only it.',
  ],
  'MINIMAL (recognisable format)': [
    'Expand; print only the result.',
    'Expand and print only the result.',
    'Expand the letters. Print only the result.',
    'Substitute and print only the result.',
    'Expand. Output only.',
  ],
};
for (const [g, list] of Object.entries(groups)) {
  console.log('=== ' + g + ' ===');
  const rows = list.map(c => [T(c), c] as [number, string]).sort((a,b)=>a[0]-b[0]);
  for (const [n, c] of rows) console.log(String(n).padStart(3), c);
  console.log();
}
console.log('CURRENT =', T(CUR));
