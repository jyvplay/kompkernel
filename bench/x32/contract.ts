import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
for (const f of (process.env.LANES||'').split(',').filter(Boolean)){
  const t=fs.readFileSync(f,'utf8');
  const r:any=heuresisEncode(t,enc);
  const ct = r.contract ? countTokens(r.contract,enc) : 0;
  console.log('='.repeat(70));
  console.log(f.split('/').pop(), '| raw',countTokens(t,enc),'| wire',r.wireTokens,'| contract',ct,'| msg',r.messageTokens,'| rules',r.rules);
  console.log('--- CONTRACT ---'); console.log(r.contract);
}
