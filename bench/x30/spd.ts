import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  const tp=Date.now(); const p:any=synkopeEncode(t,enc); const pms=Date.now()-tp;
  const tt=Date.now(); const r:any=tachosEncode(t,enc); const tms=Date.now()-tt;
  console.log(f.split('/').pop()!.padEnd(22),'bytes',String(t.length).padStart(6),
    '| synkope',String(pms).padStart(7)+'ms','| tachos',String(tms).padStart(7)+'ms',
    '| overhead',String(tms-pms).padStart(7)+'ms','| msg',p.messageTokens,'->',r.messageTokens,
    '| winner',r.winner);
}
