import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
const enc='o200k_base' as any;
const W=(process.env.W||'').split(',').map(Number).filter(n=>!isNaN(n));
const C=(process.env.C||'')==='inf'?[Infinity]:(process.env.C||'').split(',').map(Number).filter(n=>!isNaN(n));
for (const f of (process.env.LANES||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  const o:any={}; if(W.length)o.wordGrid=W; if(C.length)o.capGrid=C;
  const t0=Date.now(); const r:any=tachosEncode(t,enc,o); const ms=Date.now()-t0;
  const ok = r.winner==='bootstrap'
    ? symplokeDecode(r.wire,{stats:undefined as any,undo:(w:string)=>chironDecode(w)})===t
    : symplokeDecode(r.wire,{stats:r.stats,order:r.order,undo:(w:string)=>chironDecode(w)})===t;
  console.log(f.split('/').pop()!.padEnd(20),`w[${W}]c[${C}]`.padEnd(22),'msg',String(r.messageTokens).padStart(5),'ms',String((ms/1000).toFixed(0)+'s').padStart(6),'EXACT',ok);
}
