import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'bench/x30/fresh/prose-09.txt').split(',')) {
  const t=fs.readFileSync(f,'utf8');
  const p:any=synkopeEncode(t,enc);
  const t0=Date.now(); const r:any=tachosEncode(t,enc); const ms=Date.now()-t0;
  const ok = r.winner==='bootstrap' ? (require('@/lib/omega/chiron').chironDecode(r.wire)===t ? 'chironOK' : 'CHIRONFAIL') : '-';
  console.log(f.split('/').pop()!.padEnd(14),'raw',String(r.inTokens).padStart(4),
    '| synkope',String(p.messageTokens).padStart(4),'| tachos',String(r.messageTokens).padStart(4),
    '| delta',String(r.messageTokens-p.messageTokens).padStart(4),'| winner',r.winner.padEnd(9),
    '| brules',String(r.bootstrapRules).padStart(2),'| arms',r.arms.map((a:any)=>a.id+':'+a.tokens+(a.exact?'':'!INEXACT')).join(' '),'| ms',ms);
}
