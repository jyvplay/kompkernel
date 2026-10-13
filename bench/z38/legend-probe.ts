// Z38: token cost of alternative fixed legend lines (header instruction only; the decoder skips a leading '# ' line).
import { countTokens } from '@/lib/omega/bpe';
const variants: Record<string, string> = {
  current: '[[VXR\n# VXR: X=T in header; X in text means T; ~~ ~, ~N nl, ~R cr; ]] ends\n',
  short1: '[[VXR\n# X=T in header; X in text=T; ~~ ~, ~N nl, ~R cr; ]] ends\n',
  short2: '[[VXR\n# X=T above; X=T in text; ~~ ~ ~N nl ~R cr; ]]\n',
  short3: '[[VXR\n# X=T; ~~ ~ ~N nl ~R cr; ]]\n',
  none: '[[VXR\n]]\n',
};
for (const [k, v] of Object.entries(variants)) console.log(k, countTokens(v, 'o200k_base'), JSON.stringify(v));
