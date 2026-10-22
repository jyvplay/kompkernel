import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {chironParseTape,CHIRON_SCRIPTS} from '@/lib/omega/chiron';
import {polytroposEncode} from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const f='bench/holdout-work/kb-article.txt';
const t=fs.readFileSync(f,'utf8');
const p:any=polytroposEncode(t,enc);
const wire:string=p.wire; const pi=wire.indexOf('\u00b6');
let tape=wire.slice(0,pi); if(tape.startsWith('\u00a7')) tape=tape.slice(1);
let best:any[]=[];
for(const sc of CHIRON_SCRIPTS){const r=chironParseTape(tape,sc); if(r&&r.length>best.length) best=r;}
console.log('rules:',best.length,'tapeTok',T(tape));
let save=0;
for(const r of best){
  const m=String(r.glyph); const e=String(r.raw);
  let n=0; let idx=0; const body=wire.slice(pi+1);
  while((idx=body.indexOf(m,idx))>=0){n++;idx+=m.length;}
  const tm=T(e), tm2=T(m); save+=n*(tm-tm2);
  console.log(JSON.stringify(m),'->',JSON.stringify(e),'x',n,'expTok',tm,'markTok',tm2,'gain',n*(tm-tm2));
}
console.log('net save from rules =',save);
