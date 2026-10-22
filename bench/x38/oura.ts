import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
const enc:any='o200k_base';
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const t0=Date.now();
  const r:any=ouraEncode(t,enc);
  console.log(p.split('/').pop()!.padEnd(26),
    'oura='+(r.oura?'Y':'n'),'mode='+(r.oura?r.ouraMode:'-'),
    'shape='+(r.ouraShape?`sep=${JSON.stringify(r.ouraShape.sep)} k=${r.ouraShape.k} suf=[${r.ouraShape.suf}]`:'-'),
    'matches='+String(r.ouraMatches).padStart(4),'seps='+String(r.ouraSeps).padStart(4),
    'tok='+String(r.messageTokens).padStart(5), ((Date.now()-t0)/1000).toFixed(0)+'s');
}
