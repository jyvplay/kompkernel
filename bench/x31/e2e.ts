import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now(); const r:any=tachosEncode(t,enc); const ms=Date.now()-t0;
  const ok = r.winner==='bootstrap'
    ? symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})===t
    : symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)})===t;
  console.log(f.split('/').pop()!.padEnd(22),'tries',String(process.env.OMEGA_SIBYL_TRIES||'default').padStart(7),
    'msg',String(r.messageTokens).padStart(5),'ms',String(ms).padStart(7),'EXACT',ok);
}
