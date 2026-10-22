import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const cands = [
 'Letters before ¶ name the phrases after them. Then expand repeatedly; print result only.',
 'Letters before ¶ name the phrases after them. Expand repeatedly; print result only.',
 'Before ¶ each letter names the phrase after it. Expand repeatedly; print result only.',
 'Keys before ¶ name the phrases after them. Expand; print result only.',
 'Before ¶, each key names the phrase after it. Expand repeatedly; print only the result.',
 'Each key before ¶ names the phrase after it. Expand repeatedly; print result only.',
 'Keys before ¶ map to the phrases after them. Expand repeatedly; print result only.',
 'Before ¶: key → phrase. Expand repeatedly; print result only.',
 'Before ¶ each key names the phrase after it. Expand repeatedly; print only.',
 'Before ¶ each key names the phrase after it; expand repeatedly, print result only.',
 'Keys before ¶ name the phrases after them. Expand repeatedly, print only.',
 'Before ¶, key means the phrase after it. Expand repeatedly; print result only.',
 'Before ¶ each letter means the phrase after it. Expand repeatedly; print result only.',
 'Letters before ¶ name the phrases after them. Then expand repeatedly; print only.',
 'Before ¶: each letter names the phrase after it. Expand repeatedly; print result only.',
 'Before ¶: letter = phrase. Expand repeatedly; print result only.',
 'Before ¶: key = phrase. Expand repeatedly; print only.',
 'Before ¶: key = phrase. Expand; print only.',
 'Before ¶: key = phrase. Expand, print only.',
 'key=phrase before ¶; expand repeatedly; print only',
 'key=phrase before ¶. Expand repeatedly. Print only.',
 'Before ¶ key=phrase. Expand repeatedly. Print only.',
 'Before ¶ key=phrase. Expand. Print only.',
 'Expand key=phrase pairs before ¶ throughout; print only.',
 'Expand the key=phrase pairs before ¶ repeatedly; print only.',
 'Before ¶, key=phrase. Expand throughout; print only.',
 'key=phrase before ¶; expand throughout; print only',
 'key = phrase before ¶. Expand throughout. Print only.',
 'key = phrase before ¶. Expand. Print only.',
 'Expand; print only.',
 'Expand and print only.',
 'Expand, print only.',
];
const rows = cands.map(c=>({c,n:countTokens(c,enc)}));
rows.sort((a,b)=>a.n-b.n);
for (const r of rows) console.log(String(r.n).padStart(3), JSON.stringify(r.c));
