import fs from 'node:fs';
import { tachosEncode } from '@/lib/omega/tachos';
import { RCP } from '@/lib/omega/ariadne';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'bench/holdout-work/kb-article.txt').split(',')) {
  const t=fs.readFileSync(f,'utf8');
  RCP.calls=0; RCP.pats=0; RCP.ms=0; RCP.builds=0;
  const t0=Date.now(); const r:any=tachosEncode(t,enc); const ms=Date.now()-t0;
  console.log(f.split('/').pop()!.padEnd(20),'ms',String(ms).padStart(6),
    '| calls',String(RCP.calls).padStart(6),
    'pats',String(RCP.pats).padStart(9),
    'rcpMs',String(RCP.ms.toFixed(0)).padStart(6),
    '('+(100*RCP.ms/ms).toFixed(0)+'%)',
    '| avgPats',String(Math.round(RCP.pats/Math.max(1,RCP.calls))).padStart(6),
    '| msg',r.messageTokens);
}
