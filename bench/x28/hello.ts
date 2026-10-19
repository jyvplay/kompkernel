import { countTokens } from '@/lib/omega/bpe';
console.log('bpe ok', countTokens('hello world', 'o200k_base' as any));
