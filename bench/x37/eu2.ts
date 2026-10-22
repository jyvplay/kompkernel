import * as fs from 'node:fs';
import { euteleiaEncode, euteleiaRoundTrip } from '@/lib/omega/euteleia';
import { anadiplosisDecode } from '@/lib/omega/anadiplosis';
import { chironDecode } from '@/lib/omega/chiron';
const enc:any='o200k_base';
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const t0=Date.now();
  const r:any=euteleiaEncode(t,enc);
  const ms=Date.now()-t0;
  const back=anadiplosisDecode(r.wire,{stats:r.stats,order:r.order,
    undo:r.parent==='identity'?(w:string)=>w:chironDecode} as any,
    {alphabet:r.alphabet,marker:r.marker,marker2:r.marker2,group:r.syncopeGroup,framing:r.framing} as any);
  console.log(p.split('/').pop()!.padEnd(26),
    'eut='+(r.euteleia?'Y':'n'),'gain='+String(r.euteleiaGain).padStart(4),
    'frm='+JSON.stringify((r.framing||[]).join('')),'safe='+r.euteleiaFramings,
    'clause='+JSON.stringify(r.anadiplosisClause),
    'tok='+String(r.messageTokens).padStart(5),
    (back===t?'EXACT':'***MISMATCH***'),'rt='+euteleiaRoundTrip(t,enc),ms+'ms');
}
