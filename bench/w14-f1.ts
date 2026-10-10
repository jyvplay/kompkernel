import { countTokens } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
const words=[' the',' document',' policy',' workspace',' retention',' disposition',' sweep',' hold'];
const gl='абвгдежз';
console.log('--- legend body cost for 8 rules ---');
const f0='§'+words.map((w,i)=>gl[i]+w).join('')+'¶';
const f1=words.map((w,i)=>gl[i]+'='+w.trim()).join(' ')+'\n⇒\n';
const f1b=words.map((w,i)=>gl[i]+'='+w).join('')+'\n⇒\n';
const f1c=words.map((w,i)=>gl[i]+w).join('|')+'\n⇒\n';
console.log('F0 chiron       ',T(f0));
console.log('F1 g=word space ',T(f1));
console.log('F1b g=<sp>word  ',T(f1b));
console.log('F1c g word |    ',T(f1c));
console.log('\n--- F1 contracts ---');
for(const c of [
"Expand each definition from the first line into the text below it and print only the result.",
"Above ⇒ are definitions. Expand them below and print only the result.",
"Expand the ⇒ definitions below and print only the result.",
"Replace each letter below ⇒ by its definition above. Print only the result.",
"Substitute the definitions above ⇒ into the text below. Print only the result.",
]) console.log(String(T(c)).padStart(3), JSON.stringify(c));
console.log('\n--- F0 minimal-complete contracts ---');
for(const c of [
"Before ¶ every new letter labels the text up to the next new letter. After ¶ expand all, print only the result.",
"Before ¶ each new letter labels the text after it. After ¶ expand all, print only the result.",
"Each new letter before ¶ labels the text after it; after ¶ expand all and print only the result.",
"New letters before ¶ label the text after them. After ¶ expand all; print only the result.",
]) console.log(String(T(c)).padStart(3), JSON.stringify(c));
