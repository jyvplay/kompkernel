import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const pats=[
 {n:'quad',re:/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,f:(m:string)=>m.replace(/\./g,'')},
 {n:'semver',re:/\d+\.\d+\.\d+/g,f:(m:string)=>m.replace(/\./g,'')},
 {n:'tzhhmm',re:/[+-]\d{2}:\d{2}/g,f:(m:string)=>m.replace(':','')},
 {n:'mac',re:/[0-9a-f]{2}(:[0-9a-f]{2}){5}/gi,f:(m:string)=>m.replace(/:/g,'')},
 {n:'slashdate',re:/\d{2}\/\d{2}\/\d{4}/g,f:(m:string)=>m.replace(/\//g,'')},
];
const tot:Record<string,number>={};
for(let i=0;i<lanes.length;i++){
  const wf='bench/x24/wires/'+(i+1).toString().padStart(2,'0')+'.wire';
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8'); const base=T(w); const row:string[]=[];
  for(const p of pats){
    const n=(w.match(p.re)||[]).length; if(!n) continue;
    const d=base-T(w.replace(p.re,p.f as any));
    tot[p.n]=(tot[p.n]||0)+d;
    if(d>0) row.push(`${p.n}:${n}@${(d/n).toFixed(1)}(${d>0?'+':''}${d})`);
  }
  if(row.length) console.log(lanes[i].split('/').pop()!.padEnd(40),row.join(' '));
}
console.log('TOTAL wire-token delta:',JSON.stringify(tot));
