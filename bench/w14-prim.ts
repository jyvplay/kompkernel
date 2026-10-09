import { countTokens, tokenStrings } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
console.log('--- is a space+glyph one token? ---');
for (const g of ['а','б','в','ξ','д','ⓐ','◆','§']) {
  console.log(JSON.stringify(g), 'alone', T(g), '| " "+g', T(' '+g), '| "x "+g+" y"', T('x '+g+' y'), '| "x"+g', T('x'+g), '| g+g', T(g+g), '| g+g+g', T(g+g+g));
}
console.log('\n--- dense cyrillic reference runs ---');
const cyr='абвгдежзийклмнопрстуфхцчшщъыьэюя';
for (const k of [1,2,3,4,6,8]) {
  let s=''; for(let i=0;i<k;i++) s+=cyr[(i*7)%32];
  console.log(`${k} refs`, JSON.stringify(' '+s), T(' '+s), '=>', (T(' '+s)/k).toFixed(2),'tok/ref');
}
console.log('\n--- word with/without leading space ---');
for (const w of ['the','document','policy','retention','workspace','disposition']) {
  console.log(JSON.stringify(' '+w), T(' '+w), '|', JSON.stringify(w), T(w), '| " "+glyph vs " "+word:', T(' а'), 'vs', T(' '+w));
}
console.log('\n--- binding-site cost: "word"+glyph ---');
for (const w of ['the','document','policy']) {
  console.log(`" ${w}"=${T(' '+w)}  " ${w}а"=${T(' '+w+'а')}  delta=${T(' '+w+'а')-T(' '+w)}`);
}
console.log('\n--- CONTRACT CANDIDATES ---');
const cs=[
"\nEvery new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.",
"Each Cyrillic letter stands for the word it is first attached to. Print the restored text.",
"A Cyrillic letter after a word names it; later that letter is that word. Print the text.",
"Each letter means the word it first followed. Print the text.",
"Each letter means the word it first follows. Print the restored text.",
"Letters stand for the word they first follow. Print the text.",
"Every Cyrillic letter stands for the word it first follows, space included. Print only the restored text.",
"Each Cyrillic letter is short for the word before its first use. Print the restored text.",
];
for (const c of cs) console.log(String(T(c)).padStart(3), JSON.stringify(c));
