import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const G = ['ж','а','б','в','г','д','е'];
const pairs: Array<[string,string]> = [];
function row(label: string, s: string) { pairs.push([label, s]); console.log(String(T(s)).padStart(3), JSON.stringify(s)); }
console.log('--- A. Latin word + isolated Cyrillic glyph ---');
for (const w of ['the','before','Policies','determines','workspace']) {
  const g = 'ж';
  console.log(w.padEnd(11), 'sep', T(w + ' ' + g), '| attached', T(w + g), '| word alone', T(w), '| glyph alone', T(g));
}
console.log('--- B. two isolated glyphs, various separators ---');
for (const sep of ['', ' ', '.', ',', '|', '/', '-', '_']) console.log(JSON.stringify(sep).padEnd(5), T('ж'+sep+'а'));
console.log('--- C. Cyrillic runs, ordinal vs not ---');
console.log('абвгде  ', T('абвгде'));
console.log('жзабвгд ', T('жзабвгд'));
console.log('ених    ', T('ених'), ' ених reversed', T('хинй'));
console.log('--- D. glyph after punctuation / newline ---');
for (const p of ['.', ',', '\n', ' ', '(']) console.log(JSON.stringify(p+'ж').padStart(5), T(p+'ж'), ' vs ', JSON.stringify(p), T(p), '+', T('ж'));
console.log('--- E. does a Latin-attached glyph beat the English it replaced? ---');
for (const [eng, g] of [[' the','ж'],[' it','а'],[' and','б'],[' retention','в']] as Array<[string,string]>)
  console.log(JSON.stringify(eng).padEnd(12), 'eng', T(eng), '| glyph', T(g), '| attached to "x"', T('x'+g));
console.log('--- F. candidate tape delimiters (cost per rule) ---');
for (const d of ['', '=', ':', '|', ',', ';', ' ', '\n', '→', ' ']) console.log(JSON.stringify(d).padEnd(5), T(d+'ж'), T('ж'+d));
