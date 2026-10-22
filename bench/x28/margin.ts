import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const words = ['the','and','policy','retention','document','before','after','creates','workspace','sweep','order','first','attached','disposition','holds','later','affects','never','prove','auditor','given','point','fixed','system','every','inherits','exactly','resolved','moment','changing'];
const cands = ['~','^','`','|','\\','#','@','$','%','&','*','+','=','<','>','?','!',';',':','"',"'",'/','{','}','[',']','(',')','_','-','.',',',
  '0','1','2','9','a','q','z','X','Q','Z','ж','а','—','·','§','¶','×','…','€','£','¥','©','®','°','±','µ','»','«'];
console.log('char   avg T(word+char) - T(word)   [over 30 common words]  (0 = free attachment)');
const rows: Array<[number,string]> = [];
for (const c of cands) {
  let d = 0;
  for (const w of words) d += T(w + c) - T(w);
  rows.push([d / words.length, c]);
}
rows.sort((a,b)=>a[0]-b[0]);
for (const [d,c] of rows.slice(0,18)) console.log(JSON.stringify(c).padEnd(6), d.toFixed(2).padStart(6));
console.log('...worst:', rows.slice(-4).map(([d,c])=>JSON.stringify(c)+':'+d.toFixed(2)).join(' '));
console.log('--- reference: Cyrillic isolated glyph ---');
let dc = 0; for (const w of words) dc += T(w + 'ж') - T(w); console.log('ж'.padEnd(6), (dc/words.length).toFixed(2));
console.log('--- and leading side: T(char+word) - T(word) ---');
const rows2: Array<[number,string]> = [];
for (const c of cands) { let d = 0; for (const w of words) d += T(c + w) - T(w); rows2.push([d/words.length, c]); }
rows2.sort((a,b)=>a[0]-b[0]);
for (const [d,c] of rows2.slice(0,10)) console.log(JSON.stringify(c).padEnd(6), d.toFixed(2).padStart(6));
