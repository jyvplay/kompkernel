import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { CHIRON_START, CHIRON_SEP, chironOpsUsed } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire);
  const u:any=chironOpsUsed(w);
  console.log(f.split('/').pop()!.padEnd(26),'msg',String(r.messageTokens).padStart(5),
    '| rep',String(!!u.rep).padStart(5),'fill',String(!!u.fill).padStart(5),
    'range',String(!!u.range).padStart(5),'split',String(!!u.split).padStart(5),
    '| parent',r.parent);
}
