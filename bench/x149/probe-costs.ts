import { countTokens } from '../../src/lib/omega/bpe';
const sp = (k: number) => countTokens(' '.repeat(k), 'o200k_base');
console.log('space-run token costs:', [2,3,4,5,6,7,8,10,12,14,16,20].map((k) => `${k}->${sp(k)}`).join(' '));
console.log('date samples:', countTokens(' May 7', 'o200k_base'), countTokens(' May  7  2024', 'o200k_base'), countTokens('λы7', 'o200k_base'));
console.log('num samples:', countTokens(' 4096', 'o200k_base'), countTokens('  4096', 'o200k_base'), countTokens('       4096', 'o200k_base'));
