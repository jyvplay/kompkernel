// z56: o200k token cost of candidate progression markers, and of the numbers they would replace.
import { countTokensExact } from '@/lib/omega/bpe';
for (const m of ['⁺', '+', '~', '^', '¤', '×', '⁼', '⟨⟩']) {
  console.log(JSON.stringify({ marker: m, tokensAlone: countTokensExact(m, 'o200k_base'), inLine: countTokensExact(`x=${m} y=`, 'o200k_base') - countTokensExact('x= y=', 'o200k_base') }));
}
for (const n of ['7', '35', '77', '119', '395', '1234', '10244', '2014', '100']) console.log(JSON.stringify({ number: n, tokens: countTokensExact(`x=${n} y=`, 'o200k_base') - countTokensExact('x= y=', 'o200k_base') }));
