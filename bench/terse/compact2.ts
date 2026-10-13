import { countTokens } from '../../src/lib/omega/bpe';
const s = '¶';
const c: Record<string, string> = {
  current: `Every new Hangul letter before ${s} starts a rule whose text runs to the next new letter or to ${s}. In the text after ${s} expand every rule, repeatedly, and print only the result.`,
  K1: `Each new Hangul before ${s} opens a rule up to the next new Hangul or ${s}. After ${s}, expand rules recursively; print only the result.`,
  K2: `Each first-seen Hangul before ${s} opens a rule up to the next first-seen Hangul or ${s}. After ${s}, expand rules recursively; print only the result.`,
  K3: `New Hangul before ${s} starts a rule to the next new Hangul or ${s}. After ${s}, expand rules recursively; print only the result.`,
  K4: `Each new Hangul before ${s} starts a rule until the next new Hangul or ${s}. After ${s}, expand all rules recursively; print only the result.`,
};
for (const [k, v] of Object.entries(c)) console.log(k, countTokens(v, 'o200k_base'));
