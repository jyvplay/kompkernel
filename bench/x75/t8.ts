/** Cost of the long CHIRON clause versus shorter total, sound phrasings the reader can execute cold. */
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const LONG = 'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.';
const cands = [
  LONG,
  'Before ¶ a new foreign letter labels text up to the next new letter. After ¶ expand all repeatedly; print result only.',
  'Before ¶ a new foreign letter names the run up to the next new letter. After ¶ expand repeatedly; print only.',
  'Before ¶ a new foreign letter names text to the next new letter. After ¶ expand repeatedly; print only.',
  'Before ¶ a new letter names the text to the next new letter. After ¶ expand it repeatedly; print only.',
  'Before ¶ each new letter names text to the next letter. After ¶ expand repeatedly; print only.',
];
for (const c of cands) console.log(String(T(c, enc)).padStart(4), c);
