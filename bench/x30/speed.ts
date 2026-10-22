import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'bench/holdout-work/kb-article.txt').split(',')) {
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now(); const r:any=synkopeEncode(t,enc); const ms=Date.now()-t0;
  console.log(f.split('/').pop()!.padEnd(22),'bytes',String(t.length).padStart(6),'msg',String(r.messageTokens).padStart(5),'ms',String(ms).padStart(7),'B/s',(t.length/(ms/1000)).toFixed(0));
}
