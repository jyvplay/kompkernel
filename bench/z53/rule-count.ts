// z53: o200k token cost of candidate dispatch rules for the brace-tree arm (the line the reader sees first).
import { countTokens } from '@/lib/omega/bpe';
import { DENS_RULE, DENS_RULE_V } from '@/lib/omega/dendrons';
const R: Record<string, string> = {
  DENS_RULE_current: DENS_RULE,
  DENS_RULE_V_current: DENS_RULE_V,
  R2_mechanism: '∴ lines: bash brace expansion ({a,b} = text + a, then text + b; groups nest). Expand, one line per result.',
  R3_terse: '∴ lines: bash brace expansion; one result per line.',
  R4_terse_verbatim: '∴ lines: bash brace expansion; one result per line. A line starting with ! is literal: drop the !.',
  R5_bare: '∴ bash brace expansion per line.',
};
for (const [k, v] of Object.entries(R)) console.log(JSON.stringify({ rule: k, tokens: countTokens(v, 'o200k_base'), chars: [...v].length }));
