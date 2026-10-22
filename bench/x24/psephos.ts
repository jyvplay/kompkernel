import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {polytroposEncode} from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const files=(process.env.FILES||'').split(',').filter(Boolean);
const DATE=/\d{4}-\d{2}-\d{2}/g, TIME=/\d{2}:\d{2}:\d{2}/g;
function bareRun(t:string,len:number,exclude:RegExp){
  // count maximal digit runs of exactly len that are NOT part of an exclude-match
  const spans:Array<[number,number]>=[];
  exclude.lastIndex=0; let m;
  while((m=exclude.exec(t))) spans.push([m.index,m.index+m[0].length]);
  let n=0; const re=/\d+/g; let d;
  while((d=re.exec(t))){
    if(d[0].length!==len) continue;
    const hit=spans.some(([a,b])=>d.index>=a&&d.index<b);
    if(!hit) n++;
  }
  return n;
}
console.log('lane'.padEnd(34),'raw'.padStart(6),'polyM'.padStart(6),'psephM'.padStart(7),'delta'.padStart(6),'flags');
for(const f of files){
  const t=fs.readFileSync(f,'utf8'); const raw=T(t);
  const p:any=polytroposEncode(t,enc); const polyM=p.messageTokens as number;
  let c=t; const flags:string[]=[];
  const nDate=(t.match(DATE)||[]).length, nTime=(t.match(TIME)||[]).length;
  let useD=nDate>0, useT=nTime>0;
  if(useD && bareRun(t,8,DATE)>0){useD=false;flags.push('D-conflict');}
  if(useT && bareRun(t,6,TIME)>0){useT=false;flags.push('T-conflict');}
  if(useD){c=c.replace(DATE,m=>m.replace(/-/g,''));flags.push('D'+nDate);}
  if(useT){c=c.replace(TIME,m=>m.replace(/:/g,''));flags.push('T'+nTime);}
  const q:any=polytroposEncode(c,enc);
  console.log(f.split('/').pop()!.padEnd(34),String(raw).padStart(6),String(polyM).padStart(6),String(q.messageTokens).padStart(7),String(q.messageTokens-polyM).padStart(6),flags.join(','));
}
