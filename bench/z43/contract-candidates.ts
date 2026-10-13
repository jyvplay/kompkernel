// Z43: token counts for candidate DAEDALUS decoder-contract wordings (wire unchanged). Counting only.
import { countTokens } from '@/lib/omega/bpe';
const cands: Record<string, string> = {
  current: 'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.',
  lakonikos_hangul: 'New Hangul before ¶ starts a rule to the next new Hangul or ¶. After ¶, expand rules recursively; print only the result.',
  cyr_short: 'Cyrillic letters before ¶ start rules, each running to the next new letter or ¶. After ¶, expand all rules repeatedly and print only the result.',
  cyr_terse: 'Each new Cyrillic letter before ¶ starts a rule up to the next new letter or ¶. After ¶, expand all rules recursively; print only the result.',
};
for (const [k, v] of Object.entries(cands)) console.log(k.padEnd(18), 'o200k', countTokens(v, 'o200k_base'), 'cl100k', countTokens(v, 'cl100k_base'), '|', v);
