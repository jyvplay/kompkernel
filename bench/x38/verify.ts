import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { ouraDecode } from '@/lib/omega/oura';
import { chironDecode } from '@/lib/omega/chiron';
const enc:any='o200k_base';
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const t0=Date.now();
  const r:any=ouraEncode(t,enc);
  const back=ouraDecode(r.wire,{stats:r.stats,order:r.order,
    undo:r.parent==='identity'?(w:string)=>w:chironDecode} as any,
    {alphabet:r.alphabet,marker:r.marker,marker2:r.marker2,group:r.syncopeGroup,
     framing:r.framing,ouraShape:r.ouraShape,ouraMode:r.ouraMode,ouraSentinel:r.ouraSentinel} as any);
  console.log(p.split('/').pop()!.padEnd(26),
    'oura='+(r.oura?'Y':'n'),'tok='+String(r.messageTokens).padStart(5),
    (back===t?'EXACT':'***MISMATCH***'), ((Date.now()-t0)/1000).toFixed(0)+'s');
}
