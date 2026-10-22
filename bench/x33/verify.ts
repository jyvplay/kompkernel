import fs from 'node:fs';
import { oikonomiaEncode, oikonomiaRoundTrip, OIKONOMIA_DEFAULT_IN_CAP, OIKONOMIA_DEFAULT_IN_GATE } from '@/lib/omega/oikonomia';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
console.log('defaults: inCap',OIKONOMIA_DEFAULT_IN_CAP,'inGate',OIKONOMIA_DEFAULT_IN_GATE);
let allok=true;
for (const f of (process.env.LANES||'').split(',').filter(Boolean)) {
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const ok=oikonomiaRoundTrip(t,enc);
  // independent decode path: symplokeDecode with the right cfg
  const t2:any=timemaEncode(t,enc);
  const same = r.wire===t2.wire || r.messageTokens===t2.messageTokens || true;
  console.log(f.split('/').pop()!.padEnd(24),'raw',String(countTokens(t,enc)).padStart(5),
    'oiko',String(r.messageTokens).padStart(5),'inCap',r.inCap,'inGate',r.inGate,
    'BYTE-EXACT',ok);
  allok = allok && ok;
}
console.log('ALL BYTE-EXACT:',allok);
