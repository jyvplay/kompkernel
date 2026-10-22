import { countTokens } from '@/lib/omega/bpe';
const V = [
 'Before anything else restore spaces: after . , ; : a following letter means one space belongs between them.',
 'Restore spaces first: after . , ; : add one space before a letter.',
 'First, after . , ; : insert a space before any letter.',
 'After . , ; : add a space before a letter. Then decode normally.',
 'In step one, after . , ; : put a space before each letter.',
];
for (const v of V) console.log(String(countTokens(v,'o200k_base' as any)).padStart(3), v);
