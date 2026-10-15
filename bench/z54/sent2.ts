import { countTokens } from '@/lib/omega/bpe';
import { GNOMON_REST_SENTENCE, GNOMON_NPM_SENTENCE } from '@/lib/omega/gnomon';
console.log(JSON.stringify({ rest: countTokens(GNOMON_REST_SENTENCE, 'o200k_base'), npm: countTokens(GNOMON_NPM_SENTENCE, 'o200k_base') }));
