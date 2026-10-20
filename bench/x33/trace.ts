import fs from 'node:fs';
import { timemaEncode } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
(globalThis as any).__OMEGA_TRACE=[];
const f=process.env.F||'';
const t=fs.readFileSync(f,'utf8');
const r:any=timemaEncode(t,enc);
console.log(JSON.stringify({lane:f.split('/').pop(),raw:countTokens(t,enc),msg:r.messageTokens,order:r.order,trace:(globalThis as any).__OMEGA_TRACE}));
