// Token counts for compact decoder-contract wordings (rules-only). Semantics checklist in bench/terse/README.md.
import { countTokens } from '../../src/lib/omega/bpe';
const L = 'Hangul letter', s = '¶';
const cands: Record<string, string> = {
  current: `Every new ${L} before ${s} starts a rule whose text runs to the next new letter or to ${s}. In the text after ${s} expand every rule, repeatedly, and print only the result.`,
  C1: `Each new ${L} before ${s} starts a rule ending before the next new letter or ${s}. After ${s}, expand rules recursively; print only the result.`,
  C2: `New ${L} before ${s} = rule, running to the next new letter or ${s}. After ${s}: expand rules recursively; print only the result.`,
  C3: `Before ${s}, each new ${L} opens a rule to the next new letter or ${s}. After ${s}, expand rules recursively; output only that.`,
  C4: `New ${L}s before ${s} open rules (until the next new letter or ${s}). After ${s}, expand all rules recursively; print only the output.`,
  C5: `Rules: each new ${L} before ${s} runs to the next new letter or ${s}. After ${s}, expand rules recursively; print only the result.`,
  C6: `Each new ${L} before ${s} opens a rule until the next new letter or ${s}; after ${s}, expand rules recursively and print only the result.`,
};
for (const [k, v] of Object.entries(cands)) console.log(JSON.stringify({ k, tok: countTokens(v, 'o200k_base'), text: v }));
