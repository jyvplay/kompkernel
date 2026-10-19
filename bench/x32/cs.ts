import fs from 'node:fs';
import { timemaEncode } from '@/lib/omega/timema';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=timemaEncode(t,enc);
  const ct=r.contract?countTokens(r.contract,enc):0;
  console.log('='.repeat(72));
  console.log(f.split('/').pop(),'| msg',r.messageTokens,'| contract',ct,'| rungs',r.contractRungs.join(','));
  console.log(JSON.stringify(r.contract));
}
