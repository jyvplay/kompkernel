import { countTokens } from '@/lib/omega/bpe';
import { chironDecoderPrompt, CHIRON_SEP, CHIRON_START } from '@/lib/omega/chiron';
const enc = 'o200k_base' as const;
const wire = CHIRON_START + 'дrichtоbewahrungsдӣ' + CHIRON_SEP + 'body';
const shipped = chironDecoderPrompt(wire).slice(('x' + '\n').length - 1 + 0);
const clause = chironDecoderPrompt(wire).split('\n').slice(1).join('\n');
const V: Record<string,string> = {
  shipped_clause: clause,
  V1: 'Each new Cyrillic letter before ¶ is a rule: its text runs to the next new letter or ¶. Expand all rules in the text after ¶, repeatedly, and print only the result.',
  V2: 'Each new Cyrillic letter before ¶ stands for the text up to the next new letter or ¶. Print the text after ¶ with every letter replaced by its text, repeatedly.',
  V3: 'Cyrillic letters before ¶ are rules: each stands for the text up to the next new letter or ¶. Print the text after ¶, fully expanded.',
  V4: 'Letters before ¶ are rules: each stands for the text up to the next new letter or ¶. Print the text after ¶ fully expanded.',
  V5: 'Expand the Cyrillic-letter rules before ¶ (each runs to the next new letter or ¶) in the text after ¶; print only the result.',
  V6: 'Rules: each new Cyrillic letter before ¶ = the text up to the next new letter or ¶. Print the text after ¶, all rules expanded.',
};
for (const [k, v] of Object.entries(V)) console.log(k.padEnd(16), String(countTokens(v, enc)).padStart(4), JSON.stringify(v.slice(0, 60)));
