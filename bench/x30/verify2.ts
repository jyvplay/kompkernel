import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { synkopeEncode } from '@/lib/omega/synkope';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
const enc='o200k_base' as any;
const files=fs.readdirSync('bench/x30/fresh').filter(f=>f.endsWith('.txt')).sort();
let imp=0, totS=0, totT=0;
for(const f of files){
  const t=fs.readFileSync('bench/x30/fresh/'+f,'utf8');
  const p:any=synkopeEncode(t,enc);
  const r:any=tachosEncode(t,enc);
  // decode the SHIPPED wire the way the shipped contract says to
  let exact:boolean;
  if(r.winner==='bootstrap') exact = symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})===t;
  else exact = symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)})===t;
  const d = r.messageTokens - p.messageTokens;
  if(d<0) imp++;
  totS+=p.messageTokens; totT+=r.messageTokens;
  console.log(f.padEnd(14),'raw',String(r.inTokens).padStart(4),'synkope',String(p.messageTokens).padStart(4),
   'tachos',String(r.messageTokens).padStart(4),'delta',String(d).padStart(4),
   'winner',r.winner.padEnd(9),'EXACT',exact);
}
console.log('TOTAL synkope',totS,'tachos',totT,'delta',totT-totS,'| lanes improved',imp,'/',files.length);
