import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {polytroposEncode} from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const SH=+(process.env.SHARD||0), NS=+(process.env.NSHARD||1);
fs.mkdirSync('bench/x24/wires',{recursive:true});
for(let i=0;i<lanes.length;i++){
  if(i%NS!==SH) continue;
  const f=lanes[i]; const out='bench/x24/wires/'+(i+1).toString().padStart(2,'0')+'.wire';
  if(fs.existsSync(out)) {console.log('skip',i,f);continue;}
  const t=fs.readFileSync(f,'utf8');
  const p:any=polytroposEncode(t,enc);
  fs.writeFileSync(out,p.wire);
  console.log(i,f.split('/').pop(),'raw',T(t),'polyM',p.messageTokens,'wireTok',T(p.wire));
}
