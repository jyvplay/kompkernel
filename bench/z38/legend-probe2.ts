// Z38: legend variants WITH the decode instruction the single user message needs (the instruction is counted).
import { countTokens } from '@/lib/omega/bpe';
const v: Record<string, string> = {
  fullVXR: '[[VXR\n# VXR: X=T in header; X in text means T; ~~ ~, ~N nl, ~R cr; ]] ends\n',
  minimalNoInstr: '[[VXR\n# X=T; ]]\n',
  minimalWithInstr: '[[VXR\n# X=T; output the decoded text exactly; ]]\n',
  minimalWithInstr2: '[[VXR\n# Decode: X=T. Output the original text exactly. ]]\n',
  minimalWithInstr3: '[[VXR\n# X=T; print the decoded text; ]]\n',
  escapeWithInstr: '[[VXR\n# X=T; ~~ ~N nl ~R cr; output the decoded text exactly; ]]\n',
};
for (const [k, s] of Object.entries(v)) console.log(k, countTokens(s, 'o200k_base'));
