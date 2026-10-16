import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const L = 'Arabic'; // the script DAEDALUS-D picked on de-kb
const v = [
  `New ${L} letter = rule to next new ${L} letter or ¶; after ¶ expand recursively; print the expansion.`,
  `New ${L} letter = rule to next new ${L} letter or ¶; after ¶ expand; print the expansion.`,
  `New ${L} letter = rule to next new letter or ¶; after ¶ expand recursively; print the expansion.`,
  `New ${L} letter = rule to next new letter or ¶; then expand; print the expansion.`,
  `New ${L} letter = rule running to the next new letter or ¶; expand after ¶; print expansion.`,
  `New ${L} letter starts a rule to the next new letter or ¶; expand after ¶; print expansion.`,
  `${L}: new letter = rule to next new letter or ¶; expand after ¶; print expansion only.`,
  `Expand: new ${L} letter = rule to next new letter or ¶; print the expansion.`,
  `Expand ${L}: new letter = rule to next new letter or ¶; print the expansion.`,
  `${L} letters: each new one defines a rule to the next new one or ¶; expand after ¶; print expansion.`,
];
for (const c of v) console.log(String(countTokens(c, enc)).padStart(3), c);
