import fs from 'node:fs';
import { tachosEncode, tachosRoundTrip } from '@/lib/omega/tachos';
import { synkopeEncode } from '@/lib/omega/synkope';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'bench/holdout-work/kb-article.txt,bench/x30/fresh/prose-09.txt').split(',')) {
  if(!fs.existsSync(f)){ console.log('MISSING',f); continue; }
  const t=fs.readFileSync(f,'utf8');
  const tp=Date.now(); const p:any=synkopeEncode(t,enc); const pms=Date.now()-tp;
  const tt=Date.now(); const r:any=tachosEncode(t,enc); const tms=Date.now()-tt;
  let exact:boolean;
  if(r.winner==='bootstrap') exact = symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})===t;
  else exact = symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)})===t;
  console.log(f.split('/').pop()!.padEnd(16),'raw',String(r.inTokens).padStart(4),
   'synkope',String(p.messageTokens).padStart(4),'tachos',String(r.messageTokens).padStart(4),
   'd',String(r.messageTokens-p.messageTokens).padStart(4),'winner',r.winner.padEnd(9),
   'ms',String(tms).padStart(6),'EXACT',exact);
}
