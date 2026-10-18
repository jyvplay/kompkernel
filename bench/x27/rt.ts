import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironDecode } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
for (const f of (process.env.F||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  const r=metathesisEncode(t,enc,{budgetMs:Number(process.env.B||1200)});
  const undo=(w:string)=>(r.parent==='identity'?w:chironDecode(w));
  let ok=false; try{ok=metathesisDecode(r.wire,{stats:r.stats,order:r.order,undo})===t;}catch(e){}
  console.log(f.split('/').pop()!.padEnd(34),'in',String(r.inTokens).padStart(5),'-> msg',String(r.messageTokens).padStart(5),
    '| wire',String(r.parentWireTokens).padStart(5),'->',String(r.wireTokens).padStart(5),
    '| gain',String(r.wireTokens-r.parentWireTokens).padStart(4),'| rules',String(r.rules).padStart(4),
    '| exact',ok,'| search',r.searchMs+'ms');
}
