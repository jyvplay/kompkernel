import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const files=fs.readdirSync('bench/x30/fresh').filter(f=>f.endsWith('.txt')).sort();
let raw=0,msg=0; const out:any[]=[];
for(const f of files){
  const t=fs.readFileSync('bench/x30/fresh/'+f,'utf8');
  const t0=Date.now(); const r:any=synkopeEncode(t,enc); const ms=Date.now()-t0;
  const ok = (r.messageTokens>0);
  raw+=r.inTokens; msg+=r.messageTokens;
  out.push({file:f,bytes:t.length,raw:r.inTokens,msg:r.messageTokens,rules:r.rules,ms,parent:r.parent,rungs:r.rungs});
  console.log(f.padEnd(14),'bytes',String(t.length).padStart(5),'raw',String(r.inTokens).padStart(4),'msg',String(r.messageTokens).padStart(4),
    'ret',(100*r.messageTokens/r.inTokens).toFixed(1)+'%','rules',String(r.rules).padStart(3),'ms',String(ms).padStart(6),'parent',r.parent);
  fs.appendFileSync('bench/x30/gen.jsonl',JSON.stringify(out[out.length-1])+'\n');
}
console.log('TOTAL raw',raw,'msg',msg,'retention',(100*msg/raw).toFixed(2)+'%');
console.log('ALLDONE');
