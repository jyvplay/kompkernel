import { countTokens } from '@/lib/omega/bpe';
const V=[
 'Finally, after . , ; : insert one space unless a space or line break already follows.',
 'Finally, after . , ; : add a space unless a space, a newline, or . , ; : follows.',
 'Finally, after . , ; : add one space unless what follows is a space, a newline, or one of . , ; :.',
 'Finally, after . , ; : add a space unless the next character is whitespace or punctuation.',
 'Finally, after each . , ; : add a space unless the next character is a space, newline, or another mark.',
];
for(const v of V) console.log(String(countTokens(v,'o200k_base' as any)).padStart(3), v);
