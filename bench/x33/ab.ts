import fs from 'node:fs';
import { timemaEncode, timemaRoundTrip } from '@/lib/omega/timema';
import { oikonomiaEncode, oikonomiaRoundTrip } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.F||'';
const t=fs.readFileSync(f,'utf8');
let t0=Date.now(); const a:any=timemaEncode(t,enc); const msA=Date.now()-t0;
const okA=timemaRoundTrip(t,enc);
t0=Date.now(); const b:any=oikonomiaEncode(t,enc); const msB=Date.now()-t0;
const okB=oikonomiaRoundTrip(t,enc);
console.log(JSON.stringify({lane:f.split('/').pop(),raw:countTokens(t,enc),
  timema:a.messageTokens,oiko:b.messageTokens,delta:b.messageTokens-a.messageTokens,
  msA,msB,speed:+(msA/Math.max(1,msB)).toFixed(2),okA,okB,ordA:a.order,ordB:b.order}));
