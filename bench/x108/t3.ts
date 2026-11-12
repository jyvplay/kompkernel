import { countTokens } from '../../src/lib/omega/bpe';
const enc:any='o200k_base';
for(const l of [
 '⁺ = the number at the same position in the line above, plus the change from the line two above.',
 '⁺ = number at same position above, plus change from two lines above.',
 '⁺ = number at same position above + change from two lines above.',
 '⁺ = num at same pos above + change from 2 lines above.',
]) console.log(`${String(countTokens(l,enc)).padStart(3)}  ${JSON.stringify(l)}`);
