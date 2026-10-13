// Counts o200k tokens of decoder-contract candidates (rules-only tape). Pure measurement.
import { countTokens } from '../../src/lib/omega/bpe';
import { chironDecoderPrompt, CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';
const L = (CHIRON_SCRIPTS[0] as any).label as string;
const sep = '¶';
const wire = '§x¶body';
const cur = chironDecoderPrompt('§' + 'ꀀ' + 'a' + sep + 'b');
const cands: Record<string, string> = {
  current: cur,
  V1: `Each new ${L} before ${sep} opens a rule that runs to the next new ${L} or to ${sep}. After ${sep}, expand all rules repeatedly and print only the result.`,
  V2: `Before ${sep}, each new ${L} starts a rule up to the next new ${L} or ${sep}. After ${sep}, expand the rules recursively; print only the result.`,
  V3: `Each new ${L} before ${sep} defines a rule up to the next new ${L} or ${sep}. Expand rules recursively after ${sep}; print only the output.`,
  V4: `Each new ${L} before ${sep} begins a rule ending before the next new ${L} or ${sep}; after ${sep}, expand rules recursively and print the result.`,
};
for (const [k, v] of Object.entries(cands)) console.log(JSON.stringify({ k, tok: countTokens(v, 'o200k_base'), text: v }));
