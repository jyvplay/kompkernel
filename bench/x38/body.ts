import * as fs from 'node:fs';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
const enc:any='o200k_base';
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const r:any=anadiplosisEncode(t,enc);
  const cut=r.wire.indexOf('\u00b6',1);
  console.log('=====',p.split('/').pop(),'msg='+r.messageTokens,'rules='+r.rules);
  console.log('--- CONTRACT:',JSON.stringify(r.contract));
  console.log('--- GLOSS[0:400]:',JSON.stringify(r.wire.slice(1,cut).slice(0,400)));
  console.log('--- BODY[0:700]:',JSON.stringify(r.wire.slice(cut+1).slice(0,700)));
}
