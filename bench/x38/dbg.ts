import * as fs from 'node:fs';
import { ouraFind, OURA_SENTINELS } from '@/lib/omega/oura';
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const sh=ouraFind(t);
  const free=[...OURA_SENTINELS].filter(s=>!t.includes(s));
  console.log('===',p.split('/').pop(),'shapes='+sh.length,'freeSentinels='+free.length,JSON.stringify(free.slice(0,5).join('')));
  for(const s of sh.slice(0,6))
    console.log('    sep='+JSON.stringify(s.sep),'k='+s.k,'suf=['+s.suf+']','minLen='+s.minLen,'n='+s.spans.length,'est='+s.spans.length*(s.k-1));
}
