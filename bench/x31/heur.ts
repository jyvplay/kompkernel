import fs from 'node:fs';
import { heuresisEncode, heuresisRoundTrip } from '@/lib/omega/heuresis';
import { tachosEncode } from '@/lib/omega/tachos';
const enc='o200k_base' as any;
let st=0,sr=0,tg=0,tt=0;
for (const f of (process.env.LANES||'').split(',').filter(Boolean)) {
  const t=fs.readFileSync(f,'utf8');
  const a0=Date.now(); const p:any=tachosEncode(t,enc); const pm=Date.now()-a0;
  const b0=Date.now(); const r:any=heuresisEncode(t,enc); const hm=Date.now()-b0;
  const ok=heuresisRoundTrip(t,enc);
  const d=r.messageTokens-p.messageTokens;
  st+=p.messageTokens; sr+=r.messageTokens; tg+=pm; tt+=hm;
  console.log(f.split('/').pop()!.padEnd(24),'tachos',String(p.messageTokens).padStart(5),
    'heuresis',String(r.messageTokens).padStart(5),'Δ',String(d>0?'+'+d:d).padStart(3),
    `${(pm/1000).toFixed(1)}s->${(hm/1000).toFixed(1)}s`,'EXACT',ok);
}
console.log('TOTAL tachos',st,'heuresis',sr,'Δ',sr-st, `time ${(tg/1000).toFixed(0)}s->${(tt/1000).toFixed(0)}s`);
