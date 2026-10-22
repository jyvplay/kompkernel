import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
const enc:any='o200k_base';
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const r:any=anadiplosisEncode(t,enc);
  const raw=countTokens(t,enc);
  const cut=r.wire.indexOf('\u00b6',1);
  const gloss = cut<0 ? '' : r.wire.slice(1,cut);
  const body  = cut<0 ? r.wire : r.wire.slice(cut+1);
  const ct=countTokens(r.contract,enc);
  const gt=countTokens(gloss,enc);
  const bt=countTokens(body,enc);
  console.log(p.split('/').pop()!.padEnd(26),
    'raw='+String(raw).padStart(5),
    'msg='+String(r.messageTokens).padStart(5),
    'contract='+String(ct).padStart(3),
    'glossary='+String(gt).padStart(4),
    'body='+String(bt).padStart(5),
    'rules='+String(r.rules).padStart(4),
    'gain='+String(r.messageTokens-raw).padStart(6),
    'glossFrac='+(100*gt/r.messageTokens).toFixed(1)+'%');
}
