import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { RCP, rcpDistinct } from '@/lib/omega/ariadne';
const enc='o200k_base' as any;
const t=fs.readFileSync(process.env.F||'bench/holdout-work/kb-article.txt','utf8');
const t0=Date.now(); const r:any=tachosEncode(t,enc); const ms=Date.now()-t0;
const d=rcpDistinct();
console.log((process.env.F||'').split('/').pop()!.padEnd(20),'ms',String(ms).padStart(6),
 'calls',String(RCP.calls).padStart(8),'distinct-assignments',String(d).padStart(8),
 '=> memo hit rate',(100*(1-d/RCP.calls)).toFixed(1)+'%','| msg',r.messageTokens);
