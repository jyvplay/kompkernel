// z56: token cost of candidate ONOMASIA contract sentences (o200k, exact counter).
import { countTokensExact } from '@/lib/omega/bpe';
const C: Record<string, string> = {
  current: '⁺ = the number after the same text in the line above (that text is the characters just before it, back to a space or digit), plus the change from the line two above.',
  A_plain: '⁺ = the number after the same text in the line above, plus the change from the line two above.',
  B_key: '⁺ = the number after the same key in the line above, plus the change from two lines above (key = text just before it).',
  C_short: '⁺ = the number after the same text in the line above, plus the change from two lines above.',
  D_defined: '⁺ = the number after the key (text before it) in the line above, plus the change from two lines above.',
  E_arrow: '⁺ = number after the same key in the line above + (its change from two lines above).',
  F_akolouthia: '⁺ = the number at the same position in the line above, plus the change from the line two above.',
};
for (const [k, v] of Object.entries(C)) console.log(JSON.stringify({ variant: k, tokens: countTokensExact(v + '\n', 'o200k_base'), text: v }));
