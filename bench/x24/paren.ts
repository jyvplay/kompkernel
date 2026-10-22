import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
console.log('lane'.padEnd(40),'wireT'.padStart(6),'save'.padStart(5),'deriv'.padStart(6),'danger'.padStart(7),'net@clause25');
let tot=0;
for(let i=0;i<lanes.length;i++){
  const wf='bench/x24/wires/'+(i+1).toString().padStart(2,'0')+'.wire';
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8');
  const deriv=(w.match(/\) /g)||[]).length;
  const danger=(w.match(/\)(?![ \n])/g)||[]).length;
  const save=T(w)-T(w.replace(/\) /g,')'));
  tot+=save;
  if(deriv||danger) console.log(lanes[i].split('/').pop()!.padEnd(40),String(T(w)).padStart(6),String(save).padStart(5),String(deriv).padStart(6),String(danger).padStart(7),String(save-25).padStart(10));
}
console.log('TOTAL raw save across lanes =',tot);
