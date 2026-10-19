import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const P='¶';
const H=`Before ${P} k=v. `;
const tails=[
 'expand repeatedly; print result only.',
 'expand repeatedly; print only.',
 'expand repeatedly; output only.',
 'expand repeatedly, print result only.',
 'expand repeatedly; print the result.',
 'expand all repeatedly; print result only.',
 'expand repeatedly; result only.',
 'expand repeatedly; print result.',
 'expand repeatedly. Print result only.',
 'expand repeatedly; emit result only.',
 'expand repeatedly; print text only.',
 'expand repeatedly; print result only',
 'expand repeatedly;print result only.',
];
for(const t of tails) console.log(String(countTokens(H+t,enc)).padStart(3), JSON.stringify(H+t));
console.log('--- and with FLAT verb ---');
for(const t of tails.map(t=>t.replace('expand repeatedly','expand'))) console.log(String(countTokens(H+t,enc)).padStart(3), JSON.stringify(H+t));
