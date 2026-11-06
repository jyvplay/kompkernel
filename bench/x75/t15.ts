/** X75 / t15 — cost of SOUND replacements for the shipped instruction clauses. */
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const cands: [string, string][] = [
  ['ORIGINAL rules clause', 'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.'],
  ['B keep Cyrillic+all', 'Before ¶ each new Cyrillic letter names text to the next new letter or to ¶; after ¶ expand every rule repeatedly and print only the result.'],
  ['C keep Cyrillic+all', 'Before ¶ a new Cyrillic letter names text to the next new letter or ¶. After ¶ expand repeatedly; print only.'],
  ['D no Cyrillic', 'Before ¶ a new letter names text to the next new letter or ¶. After ¶ expand repeatedly; print only.'],
  ['E terse keep Cyrillic', 'Before ¶: a new Cyrillic letter names text up to the next. After ¶ expand repeatedly; print only.'],
  ['SYNTOMIA 20tok', 'Before ¶ a new foreign letter labels text up to the next new letter. After ¶ expand all; print result only.'],
  ['ORIGINAL ⁺', '⁺ = the number at the same position in the line above, plus the change from the line two above.'],
  ['⁺ v1', '⁺ = the number above, plus its change from two lines above.'],
  ['⁺ v2', '⁺ = number above plus its change from two lines above.'],
  ['⁺ v3', '⁺ = the value above plus its change from two lines up.'],
];
for (const [n, s] of cands) console.log(`${n.padEnd(22)} ${String(T(s, enc)).padStart(3)}  ${s.slice(0, 96)}`);
