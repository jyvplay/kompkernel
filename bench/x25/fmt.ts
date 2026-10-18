import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
// candidate formats: [name, regex on WIRE, strip fn]
const FMT:{n:string;re:RegExp;f:(m:string)=>string}[]=[
 {n:'d-',    re:/\d{4}-\d{2}-\d{2}/g,                    f:m=>m.replace(/-/g,'')},
 {n:'d/',    re:/\d{4}\/\d{2}\/\d{2}/g,                  f:m=>m.replace(/\//g,'')},
 {n:'dEU',   re:/\d{2}\.\d{2}\.\d{4}/g,                  f:m=>m.replace(/\./g,'')},
 {n:'dUS',   re:/\d{2}\/\d{2}\/\d{4}/g,                  f:m=>m.replace(/\//g,'')},
 {n:'time',  re:/\d{2}:\d{2}:\d{2}/g,                    f:m=>m.replace(/:/g,'')},
 {n:'time2', re:/\d{1,2}:\d{2}(?!:)/g,                   f:m=>m.replace(/:/g,'')},
 {n:'dtT',   re:/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,  f:m=>m.replace(/[-:T]/g,'')},
 {n:'dtSp',  re:/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g,  f:m=>m.replace(/[-: ]/g,'')},
 {n:'thou',  re:/\d{1,3}(?:,\d{3})+(?!\d)/g,             f:m=>m.replace(/,/g,'')},
 {n:'ver',   re:/\d+\.\d+\.\d+/g,                        f:m=>m.replace(/\./g,'')},
 {n:'quad',  re:/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,   f:m=>m.replace(/\./g,'')},
 {n:'tz',    re:/[+-]\d{2}:\d{2}/g,                      f:m=>m.replace(/:/g,'')},
 {n:'ms',    re:/\d{2}:\d{2}:\d{2}\.\d{3}/g,             f:m=>m.replace(/[:\.]/g,'')},
 {n:'uuid',  re:/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, f:m=>m.replace(/-/g,'')},
];
const tot:Record<string,number>={}; const cnt:Record<string,number>={};
const rows:string[]=[];
let base=0;
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8'); const b=T(w); base+=b;
  const parts:string[]=[];
  for(const x of FMT){
    const n=(w.match(x.re)||[]).length; if(!n) continue;
    const d=b-T(w.replace(x.re,x.f));   // POSITIVE = saves
    tot[x.n]=(tot[x.n]||0)+d; cnt[x.n]=(cnt[x.n]||0)+n;
    if(d>0) parts.push(`${x.n}:${n}@${(d/n).toFixed(1)}(+${d})`);
  }
  if(parts.length) rows.push('  '+lanes[i].split('/').pop()!.padEnd(34)+parts.join(' '));
}
console.log(rows.join('\n'));
console.log('\nBASE wire total',base);
console.log('SAVINGS by format (positive = tokens saved):');
for(const k of Object.keys(tot).sort((a,b)=>tot[b]-tot[a]))
  console.log('  ',k.padEnd(6),'sites',String(cnt[k]).padStart(5),'net',String(tot[k]).padStart(6),'per-site',(tot[k]/cnt[k]).toFixed(2));
