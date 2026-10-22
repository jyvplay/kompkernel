import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const cands=[
 'Read 8-digit numbers as dates YYYY-MM-DD and 6-digit numbers as times HH:MM:SS.',
 'Numbers: expand 8 digits to YYYY-MM-DD and 6 digits to HH:MM:SS.',
 'In numbers restore YYYY-MM-DD and HH:MM:SS.',
 'Expand 8-digit groups as YYYY-MM-DD, 6-digit as HH:MM:SS.',
 '8 digits = YYYY-MM-DD. 6 digits = HH:MM:SS.',
 'Restore dates YYYY-MM-DD and times HH:MM:SS in bare digit runs.',
 'Numbers: rewrite every 8-digit number as a date YYYY-MM-DD and every 6-digit number as a time HH:MM:SS.',
];
for(const c of cands) console.log(String(T(c)).padStart(3), JSON.stringify(c));
console.log('--- escape clauses ---');
for(const c of [' Delete the ^ marks.',' A ^ after a number means leave it.',' Ignore ^.',' Drop ^.'])
  console.log(String(T(c)).padStart(3), JSON.stringify(c));
console.log('--- mark clauses ---');
for(const c of [' Delete the ^ marks.',' A ^ before a number means expand it.',' Drop ^.'])
  console.log(String(T(c)).padStart(3), JSON.stringify(c));
