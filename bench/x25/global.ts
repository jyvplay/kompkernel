import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const xf:{n:string;f:(s:string)=>string}[]=[
 {n:'lowercase',  f:s=>s.toLowerCase()},
 {n:'noSpaces',   f:s=>s.replace(/ /g,'')},
 {n:'sqzSpace',   f:s=>s.replace(/ {2,}/g,' ')},
 {n:'noSpaceAfterComma', f:s=>s.replace(/, /g,',')},
 {n:'noSpaceAfterPeriod',f:s=>s.replace(/\. /g,'.')},
 {n:'spaceBeforeNum',    f:s=>s.replace(/ ([0-9])/g,'$1')},
 {n:'noSpaceBeforePunc', f:s=>s.replace(/ ([^\w\s])/g,'$1')},
 {n:'commaGroup', f:s=>s.replace(/\B(?=(\d{3})+(?!\d))/g,',')},
 {n:'deaccent',   f:s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')},
];
const tot:Record<string,number>={}; let base=0;
const rows:string[]=[];
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8'); const b=T(w); base+=b;
  const parts=[lanes[i].split('/').pop()!.padEnd(34),String(b).padStart(6)];
  for(const x of xf){ const d=b-T(x.f(w)); tot[x.n]=(tot[x.n]||0)+d; parts.push(`${x.n}:${d>0?'+':''}${d}`);}
  rows.push(parts.join(' '));
}
console.log(rows.join('\n'));
console.log('BASE wire total',base);
console.log('TOTAL delta (negative = SAVES tokens):',JSON.stringify(tot));
