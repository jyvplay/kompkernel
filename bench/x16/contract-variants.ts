// X16: o200k token cost of candidate HOMOIOS contracts (the reader's rule, in band).
import { countTokens } from '@/lib/omega/bpe';
const V: Record<string, string> = {
  current: '⟪i|a→b⟫ = block i with each a replaced by b, in order; each a is the next occurrence after the previous replacement. ⟪i⟫ = block i unchanged. Blocks are numbered from 1; they are the runs separated by blank lines.',
  terse1: '⟪i|a→b⟫: block i, each a→b in order (a = next occurrence). ⟪i⟫: block i. Blocks = paragraphs, from 1.',
  terse2: '⟪i|a→b⟫: copy paragraph i, replacing each a with b in order. ⟪i⟫: copy paragraph i.',
  terse3: '⟪i|a→b⟫ = paragraph i, a→b applied in order. ⟪i⟫ = paragraph i.',
  terse4: '⟪i|a→b⟫ = para i with a→b in order; ⟪i⟫ = para i.',
};
for (const [k, v] of Object.entries(V)) console.log(k, countTokens(v, 'o200k_base'));
// per-op cost probes
for (const s of ['⟪4|12000→12731|800.→843.|11200→11888⟫', '⟪2|1→2⟫', '⟪2⟫', '|12000→12731', '12731', '⟪3|1.→2.⟫']) console.log(JSON.stringify(s), countTokens(s, 'o200k_base'));
