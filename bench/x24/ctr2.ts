import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const cands=[
 'Numbers: expand 8 digits to YYYY-MM-DD.',
 'Numbers: expand 6 digits to HH:MM:SS.',
 'Numbers: expand 8 digits to YYYY-MM-DD and 6 digits to HH:MM:SS.',
 ' A ^ after digits means leave them; drop the ^.',
 ' A ^ before digits means expand them; drop the ^.',
 'Numbers: expand 8 digits to YYYY-MM-DD. A ^ after digits means leave them; drop the ^.',
 'Numbers: expand 8 digits to YYYY-MM-DD and 6 digits to HH:MM:SS. A ^ before digits means expand them; drop the ^.',
];
for(const c of cands) console.log(String(T(c)).padStart(3), JSON.stringify(c));
