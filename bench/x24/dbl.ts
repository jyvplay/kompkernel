import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {polytroposEncode} from '@/lib/omega/polytropos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const which=(process.env.W||'').split(',').filter(Boolean).map(Number);
console.log('lane'.padEnd(40),'wireT'.padStart(6),'w2T'.padStart(6),'c1'.padStart(3),'c2'.padStart(3),'M1'.padStart(6),'M2'.padStart(6),'delta');
for(const i of which){
  const wf='bench/x24/wires/'+(i+1).toString().padStart(2,'0')+'.wire';
  if(!fs.existsSync(wf)){console.log('pending',lanes[i]);continue;}
  const wire=fs.readFileSync(wf,'utf8');
  const q:any=polytroposEncode(wire,enc);
  const w2=String(q.wire);
  const c1=25; // polytropos contract ~25 tokens, same for both passes
  const M1=T(wire)+c1, M2=T(w2)+c1+c1;
  console.log(lanes[i].split('/').pop()!.padEnd(40),String(T(wire)).padStart(6),String(T(w2)).padStart(6),String(c1).padStart(3),String(c1).padStart(3),String(M1).padStart(6),String(M2).padStart(6),String(M2-M1).padStart(6));
}
