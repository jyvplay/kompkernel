// Token cost of VXA legend phrasings. A phrasing is admissible only if it states every rule the decoder uses:
//  (1) an entry line is X=T, X one character; (2) a bare X in the body or in T expands to T;
//  (3) ~~ is a literal tilde (body and T); (4) in T, ~N is newline and ~R is CR; (5) the header ends at ]].
import { countTokens } from '@/lib/omega/bpe';
import { VXA_LEGEND } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const variants: [string, string][] = [
  ['current', VXA_LEGEND],
  ['short-a', '# VXA: X=T; bare X=T; ~~=~; T: ~N=newline ~R=CR; ]] ends header'],
  ['short-b', '# VXA: X=T, bare X means T; ~~ is ~; in T ~N newline ~R CR; header ends ]]'],
  ['short-c', '# X=T: bare X means T. ~~=~. In T: ~N newline, ~R CR. Header ends at ]]'],
  ['short-d', '# VXA X=T: bare X = T; ~~ = ~; T: ~N newline ~R CR; ]] ends'],
];
for (const [name, text] of variants) console.log(`${name}: tokens=${countTokens(text, enc)} chars=${text.length} :: ${text}`);
