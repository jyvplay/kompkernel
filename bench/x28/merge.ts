import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
// word stems typical of English prose endings
const words = ['the','policy','and','document','retention','order','first','system','before','point','past','change','date','later','only','every','exactly','resolved','moment','workspace','sweep','holds','affects','never','prove','auditor','given','fixed','inherits','attached'];
const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const rows: Array<[number,string]> = [];
for (const c of letters) { let d = 0; for (const w of words) d += T(w + c) - T(w); rows.push([d/words.length, c]); }
rows.sort((a,b)=>a[0]-b[0]);
console.log('avg T(word+c) - T(word)  [merge into preceding word; 0 = glyph is free]');
for (const [d,c] of rows.slice(0,10)) console.log('  ', JSON.stringify(c), d.toFixed(2));
console.log('   worst:', rows.slice(-3).map(([d,c])=>JSON.stringify(c)+':'+d.toFixed(2)).join(' '));
console.log('\nand on the LEADING side (glyph then phrase) T(c+word)-T(word):');
const rows2: Array<[number,string]> = [];
for (const c of letters) { let d = 0; for (const w of words) d += T(c + w) - T(w); rows2.push([d/words.length, c]); }
rows2.sort((a,b)=>a[0]-b[0]);
for (const [d,c] of rows2.slice(0,10)) console.log('  ', JSON.stringify(c), d.toFixed(2));
