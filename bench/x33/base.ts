import fs from 'node:fs';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now(); const r:any=timemaEncode(t,enc); const ms=Date.now()-t0;
  const ok=timemaRoundTrip(t,enc);
  console.log(f.split('/').pop()!.padEnd(24),'raw',String(countTokens(t,enc)).padStart(5),
    'msg',String(r.messageTokens).padStart(5),'rules',String(r.rules).padStart(4),
    'ms',String(ms).padStart(7),'EXACT',ok);
}
