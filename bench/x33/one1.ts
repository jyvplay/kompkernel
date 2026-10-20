import fs from 'node:fs';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.F||'';
const t=fs.readFileSync(f,'utf8');
const t0=Date.now(); const r:any=timemaEncode(t,enc); const ms=Date.now()-t0;
const ok=timemaRoundTrip(t,enc);
console.log(JSON.stringify({lane:f.split('/').pop(),raw:countTokens(t,enc),msg:r.messageTokens,rules:r.rules,parent:r.winner,order:r.order,trials:(r.notes||'').match(/(\d+) trials/)?.[1],ms,exact:ok,cap:process.env.OMEGA_IN_CAP||'4'}));
