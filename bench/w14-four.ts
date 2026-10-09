import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');

console.log('=== (a) MIT all-caps block ===');
const mit=fs.readFileSync('bench/holdout/lic-mit.txt','utf8');
const caps=mit.split('\n').filter(l=>/[A-Z]{4,}/.test(l)&&!/[a-z]{4,}/.test(l)).join('\n');
console.log('caps block chars',caps.length,'tok',T(caps),'lowercased tok',T(caps.toLowerCase()),'delta',T(caps)-T(caps.toLowerCase()));
console.log('whole doc',T(mit),'| lower',T(mit.toLowerCase()));

console.log('\n=== (b) markdown / ascii table de-piping ===');
const md=fs.readFileSync('bench/holdout-work/llm-answer.md','utf8');
function depipe(s:string){
  return s.split('\n').map(l=>{
    if(!/^\s*\|.*\|\s*$/.test(l)) return l;
    if(/^\s*\|[\s:|-]+\|\s*$/.test(l)) return '\u00b7';           // divider row -> 1 glyph
    return l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim()).join('\u00a6');
  }).join('\n');
}
console.log('llm-answer raw',T(md),'depiped',T(depipe(md)),'delta',T(md)-T(depipe(md)));
const k8s='NAME                        READY   STATUS    RESTARTS   AGE\n'+Array.from({length:20},(_,i)=>`api-server-7d9f8b${String(i).padStart(2,'0')}   1/1     Running   ${i%3}          ${i+2}d`).join('\n');
const sqlT=['+----+------------+--------+','| id | name       | amount |','+----+------------+--------+',
  ...Array.from({length:15},(_,i)=>`| ${String(10+i).padStart(2)} | user_${String(i).padStart(4,'0')}   | ${(100+i*7).toFixed(2).padStart(6)} |`),'+----+------------+--------+'].join('\n');
for (const [n,s] of [['k8s-cols',k8s],['psql-table',sqlT]] as Array<[string,string]>) {
  const sq=s.replace(/ {2,}/g,'\u00a6');
  console.log(`${n} raw=${T(s)} squeeze-runs=${T(sq)} delta=${T(s)-T(sq)}  depipe=${T(depipe(s))} delta=${T(s)-T(depipe(s))}`);
}

console.log('\n=== (c) legend formats, same 27 single-word rules ===');
const words=[' and',' for',' a',' policy',' looks',' attached',' The',' the',' it',' is',' to',' document',' sweep',' that',' in',' workspace',' hold',' retention',' with',' disposition',' documents',' order',' first',' created',' only',' every',' which'];
const gl='абвгдежзийклмнопрстуфхцчшщъы';
const chiron='§'+words.map((w,i)=>gl[i]+w).join('')+'¶';
const spaced=words.map((w,i)=>gl[i]+w.trim()).join(' ');
const eqline=words.map((w,i)=>gl[i]+'='+w.trim()).join(' ');
const nl=words.map((w,i)=>gl[i]+w.trim()).join('\n');
console.log('chiron delim-free :',T(chiron),'tok  (contract 40) total',T(chiron)+40);
console.log('space-separated   :',T(spaced),'tok  (contract ?) ');
console.log('a=b space-sep     :',T(eqline));
console.log('one per line      :',T(nl));

console.log('\n=== (d) minimal COMPLETE contracts for the CHIRON delimiter-free tape ===');
const cs=[
"\nEvery new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.",
"Before ¶ each new Cyrillic letter starts a rule ending at the next new letter. After ¶ expand all rules repeatedly and print only the result.",
"Before ¶: a new Cyrillic letter opens a rule that ends at the next new letter. After ¶: expand repeatedly, print only the result.",
"Before ¶ every new Cyrillic letter labels the text up to the next new letter. After ¶ expand all, print only the result.",
];
for(const c of cs) console.log(String(T(c)).padStart(3), JSON.stringify(c));
const sp=[
"Line 1 is a legend: each group is a Cyrillic letter then its word. Expand those letters in the text below and print only the result.",
"Line 1 pairs each Cyrillic letter with its word. Expand them below and print only the result.",
"Line 1: letter then word. Expand those letters below; print only the result.",
];
for(const c of sp) console.log('SPACED', String(T(c)).padStart(3), JSON.stringify(c));
