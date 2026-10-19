import fs from 'node:fs';
import { synkopeEncode } from '@/lib/omega/synkope';
const enc='o200k_base' as any;
for (const f of ['bench/holdout-work/kb-article.txt','bench/holdout-ops/ls-full-iso.txt']) {
  const t=fs.readFileSync(f,'utf8');
  const t0=Date.now(); const r:any=synkopeEncode(t,enc); const ms=Date.now()-t0;
  console.log(f.split('/').pop()!.padEnd(20),'raw',r.inTokens,'msg',r.messageTokens,'rules',r.rules,'rungs',JSON.stringify(r.rungs),'ms',ms);
}
