import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
// delete the space after ! and ? (and after ) ] " ), measure token delta per lane
const rules:{n:string;re:RegExp}[]=[
 {n:'!',re:/! /g},{n:'?',re:/\? /g},{n:'!?',re:/[!?] /g},
 {n:')',re:/\) /g},{n:'"',re:/" /g},{n:'.!?',re:/[.!?] /g},
];
const tot:Record<string,number>={};
for(const f of lanes){
  const t=fs.readFileSync(f,'utf8'); const base=T(t); const row:string[]=[];
  for(const r of rules){
    const n=(t.match(r.re)||[]).length; if(!n) continue;
    const d=base-T(t.replace(r.re,m=>m.slice(0,-1)));
    tot[r.n]=(tot[r.n]||0)+d;
    row.push(`${r.n}:${n}@${(d/n).toFixed(2)}(${d>0?'+':''}${d})`);
  }
  if(row.length) console.log(f.split('/').pop()!.padEnd(40),row.join(' '));
}
console.log('TOTAL delta by rule:',JSON.stringify(tot));
