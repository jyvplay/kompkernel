import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const heads = [
 'Letters before ¶ name the phrases after them. Then ',
 'Letters before ¶ name the phrases after them, so ',
 'Each letter before ¶ names the phrase after it. Then ',
 'Letters before ¶ define the phrases after them. Then ',
 'Before ¶: letters name the phrases after them. Then ',
 'Letters before ¶ are defined by the phrases after them. Then ',
 'A letter before ¶ stands for the phrase after it. Then ',
 'Letters before ¶ mean the phrases after them. Then ',
 'Letters before ¶: the phrase after each is its meaning. Then ',
 'Glossary before ¶, text after. A letter means the phrase after it. Then ',
 'Each letter before ¶ abbreviates the phrase after it. Then ',
 'The letters before ¶ are keys; the phrases after them are values. Then ',
 'Keys before ¶, values after; text follows ¶. Then ',
 'Letters before ¶ map to the phrases after them. Then ',
 'Letters before ¶ map onto the phrases after them. Then ',
 'Read each letter before ¶ as the phrase after it. Then ',
 'Substitute each letter before ¶ by the phrase after it. Then ',
 'Before ¶ each letter is followed by its expansion. Then ',
 'The part before ¶ defines letters; the part after ¶ uses them. Then ',
 'Letters before ¶ stand for the phrases that follow them. Then ',
];
const tails = [
 'Print only the result.',
 'Output only the result.',
 'Print the result only.',
 'Reply with the result only.',
 'Print just the result.',
 'Print only the expanded text.',
 'Output the result only.',
 'Print only it.',
 'Only print the result.',
 'Print nothing but the result.',
];
console.log('HEADS (current = 1st):');
heads.forEach(h=>console.log('  ', String(T(h)).padStart(3), JSON.stringify(h)));
console.log('TAILS:');
tails.forEach(h=>console.log('  ', String(T(h)).padStart(3), JSON.stringify(h)));
const mid = (verb:string, digits:string) => `After § ${verb} and ${digits}`;
console.log('MID variants:');
for (const m of ['After § expand repeatedly and 8 digits become YYYY-MM-DD',
                 'After § expand repeatedly, and 8 digits become YYYY-MM-DD',
                 'After §, expand repeatedly; 8 digits become YYYY-MM-DD',
                 'Past § expand repeatedly, and 8 digits become YYYY-MM-DD',
                 'After § expand repeatedly and 8 digits become YYYY-MM-DD, 6 digits become HH:MM:SS'])
  console.log('  ', String(T(m)).padStart(3), JSON.stringify(m));
// best combination
const hb = heads.map(h=>[h,T(h)] as [string,number]).sort((a,b)=>a[1]-b[1])[0];
const tb = tails.map(h=>[h,T(h)] as [string,number]).sort((a,b)=>a[1]-b[1])[0];
console.log('\nBEST head', hb[1], JSON.stringify(hb[0]));
console.log('BEST tail', tb[1], JSON.stringify(tb[0]));
const cur = T(heads[0]) + T('After § expand repeatedly and 8 digits become YYYY-MM-DD') + T('Print only the result.');
const best = hb[1] + T('After § expand repeatedly and 8 digits become YYYY-MM-DD') + tb[1];
console.log('current total', cur, '-> best', best, 'saving', cur-best);
