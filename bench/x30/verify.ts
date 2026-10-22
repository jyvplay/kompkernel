import fs from 'node:fs';
import { tachosEncode, tachosRoundTrip } from '@/lib/omega/tachos';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
const enc='o200k_base' as any;
const files=fs.readdirSync('bench/x30/fresh').filter(f=>f.endsWith('.txt')).sort();
let wins=0;
for(const f of files){
  const t=fs.readFileSync('bench/x30/fresh/'+f,'utf8');
  const r:any=tachosEncode(t,enc);
  const rt = tachosRoundTrip(t,enc);
  // independent: decode the shipped wire with the real symploke path
  let indep='-';
  if(r.winner==='bootstrap'){ indep = (symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})===t)?'EXACT':'MISMATCH'; }
  if(r.messageTokens < r.metathesisMessageTokens) wins++;
  console.log(f.padEnd(14),'raw',String(r.inTokens).padStart(4),'synkope',String(r.metathesisMessageTokens).padStart(4),
   'tachos',String(r.messageTokens).padStart(4),'delta',String(r.messageTokens-r.metathesisMessageTokens).padStart(4),
   'winner',r.winner.padEnd(9),'roundTrip',rt?'OK':'FAIL','indep',indep);
}
console.log('lanes improved:',wins,'/',files.length);
