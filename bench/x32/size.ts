import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const files = (process.env.F||'prose-01,prose-02,prose-05').split(',');
const lens  = (process.env.L||'250,500,1000,2000').split(',').map(Number);
console.log('file'.padEnd(12),'chars'.padStart(6),'raw'.padStart(6),'msg'.padStart(6),'ret%'.padStart(7),'rules'.padStart(6),'winner'.padStart(10),'ms'.padStart(7));
for (const f of files){
  const full = fs.readFileSync(`bench/x30/fresh/${f}.txt`,'utf8');
  for (const L of [...lens, full.length]){
    if (L > full.length) continue;
    const t = full.slice(0,L);
    const t0=Date.now(); const r:any=heuresisEncode(t,enc); const ms=Date.now()-t0;
    const raw=countTokens(t,enc);
    const dec = r.winner==='bootstrap'
      ? symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})
      : symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)});
    console.log(f.padEnd(12),String(L).padStart(6),String(raw).padStart(6),String(r.messageTokens).padStart(6),
      (100*r.messageTokens/raw).toFixed(1).padStart(6)+'%',String(r.rules).padStart(6),String(r.winner).padStart(10),
      String(ms).padStart(7), dec===t?'':'*** MISMATCH');
  }
}
