// X16: fixed decoder-contract cost of the DAEDALUS family (o200k tokens), and of LAKONIKOS for comparison.
import { countTokens } from '@/lib/omega/bpe';
import { chironDecoderPrompt } from '@/lib/omega/chiron';
const p = chironDecoderPrompt();
console.log('chironDecoderPrompt() tokens', countTokens(p, 'o200k_base'), 'chars', p.length);
console.log(p.slice(0, 600));
