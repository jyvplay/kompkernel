import { countTokens } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
// COMPLETE variants only: must state (a) glyph class (b) tape location
// (c) where a rule's text ends (d) expansion scope (e) output discipline.
const c=[
'Before ¶, each new non-English letter labels the text up to the next new letter. After ¶, expand all and print only the result.',
'Before ¶ a new non-English letter labels the text to the next new letter. After ¶ expand all; print only the result.',
'Before ¶ each new non-English letter labels text up to the next new letter. After ¶ expand all; print only the result.',
'Before ¶ a new non-English letter labels text to the next new letter. After ¶ expand all; print only the result.',
'Before ¶ a new non-Latin letter labels text to the next new letter. After ¶ expand all; print only the result.',
'Before ¶ a new foreign letter labels text to the next new letter. After ¶ expand all; print only the result.',
'Before ¶ a new foreign letter labels text up to the next new letter. After ¶ expand all; print result only.',
'Before ¶ a foreign letter labels text up to the next new foreign letter. After ¶ expand all; print result only.',
];
for(const x of c) console.log(String(T(x)).padStart(3), JSON.stringify(x));
console.log('--- nested suffix cost ---');
console.log(T('Before ¶ a new foreign letter labels text to the next new letter. After ¶ expand all repeatedly; print only the result.'));
console.log('--- does "foreign letter" read for CJK? add character ---');
console.log(T('Before ¶ a new foreign letter or character labels text to the next new letter. After ¶ expand all; print only the result.'));
