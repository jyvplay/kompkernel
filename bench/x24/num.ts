import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
type Pat={n:string;re:RegExp;f:(m:string)=>string};
const pats:Pat[]=[
 {n:'date-',re:/\d{4}-\d{2}-\d{2}/g,      f:m=>m.replace(/-/g,'')},
 {n:'date/',re:/\d{2}\/\d{2}\/\d{4}/g,    f:m=>m.replace(/\//g,'')},
 {n:'time',re:/\d{2}:\d{2}:\d{2}/g,       f:m=>m.replace(/:/g,'')},
 {n:'time2',re:/\d{1,2}:\d{2}/g,          f:m=>m.replace(/:/g,'')},
 {n:'thou',re:/\d{1,3}(?:,\d{3})+(?!\d)/g,f:m=>m.replace(/,/g,'')},
 {n:'quad',re:/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,f:m=>m.replace(/\./g,'')},
 {n:'ver',re:/\b\d+\.\d+\.\d+\b/g,        f:m=>m.replace(/\./g,'')},
];
const grand:Record<string,number>={}; let grandRaw=0;
const rows:string[]=[];
for(const f of lanes){
  const t=fs.readFileSync(f,'utf8'); const raw=T(t); grandRaw+=raw;
  const parts=[f.split('/').pop()!.padEnd(34),String(raw).padStart(6)];
  for(const p of pats){
    const n=(t.match(p.re)||[]).length;
    const save=raw-T(t.replace(p.re,p.f));
    if(n){grand[p.n]=(grand[p.n]||0)+n; parts.push(`${p.n}:${n}@${(save/n).toFixed(1)}(${save>0?'+':''}${save})`);}
  }
  rows.push(parts.join(' '));
}
console.log(rows.join('\n'));
console.log('TOTAL raw',grandRaw,'| occurrences',JSON.stringify(grand));
console.log('--- samples ---');
for(const s of ['2026-08-14','20260814','00:02:05','000205','18,442.17','18442.17','192.168.1.1','1.2.3','2026-10-17T03:34:16Z'])
  console.log(JSON.stringify(s),T(s));
