import fs from 'node:fs';
import { pyknosisEncode, pyknosisRoundTrip } from '@/lib/omega/pyknosis';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now(); const r:any=pyknosisEncode(t,enc); const ms=Date.now()-t0;
  const b:any=oikonomiaEncode(t,enc);
  const ok=pyknosisRoundTrip(t,enc);
  console.log(f.split('/').pop()!.padEnd(26),'raw',String(countTokens(t,enc)).padStart(5),
    'oiko',String(b.messageTokens).padStart(5),'pyk',String(r.messageTokens).padStart(5),
    'DELTA',String(r.messageTokens-b.messageTokens).padStart(5),
    'fired',String(r.pyknosis).padStart(5),'runs',String(r.hexRuns).padStart(3),
    'ms',String(ms).padStart(6),'BYTE-EXACT',ok);
}
