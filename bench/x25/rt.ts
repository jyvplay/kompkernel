import fs from 'node:fs';
import {aetosEncode,aetosDecode,aetosCandidates} from '@/lib/omega/aetos';
const enc='o200k_base' as any;
const F=(process.env.F||'bench/holdout-work/kb-article.txt,bench/z48/corpus/sp500-200.csv,bench/holdout-work/llm-answer.md,bench/z20/samples/git-log-iso.txt').split(',');
for(const f of F){
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now();
  const r=aetosEncode(t,enc);
  const dt=Date.now()-t0;
  let back=''; let ok=false;
  try{ back=aetosDecode(r.wire,{stats:r.stats,order:r.order,undo:(w)=>{
    if(r.parent==='polytropos'||r.parent==='lakonikos'||r.parent==='daedalus'){
      const {chironDecode}=require('@/lib/omega/chiron'); return chironDecode(w);
    } return w; }}); ok=back===t; }catch(e){back='ERR '+e;}
  console.log(f.split('/').pop()!.padEnd(34),'exact',String(ok).padStart(5),
    '| in',String(r.inTokens).padStart(5),'-> msg',String(r.messageTokens).padStart(5),
    '| parent',r.parent.padEnd(10),r.order.padEnd(3),'| shapes:',r.shapes.join(' ')||'(none)','|',dt+'ms');
  if(!ok) console.log('   MISMATCH len',back.length,'vs',t.length);
}
