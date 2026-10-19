import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const f=process.env.F!; const t=fs.readFileSync(f,'utf8');
const p:any=syntomosEncode(t,enc), r:any=synkopeEncode(t,enc);
const ok = (()=>{ const {synkopeDecode}=require('@/lib/omega/synkope'); const {chironDecode}=require('@/lib/omega/chiron');
  return synkopeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>r.parent==='identity'?w:chironDecode(w)})===t; })();
console.log(f.split('/').pop().padEnd(22),'raw',String(p.inTokens).padStart(5),
 '| syntomos',String(p.messageTokens).padStart(5),'| synkope',String(r.messageTokens).padStart(5),
 '| delta',String(r.messageTokens-p.messageTokens).padStart(4),'| rungs',JSON.stringify(r.rungs),'| exact',ok);
if(r.messageTokens!==p.messageTokens){ console.log('   OLD:',JSON.stringify(p.contract)); console.log('   NEW:',JSON.stringify(r.contract)); }
