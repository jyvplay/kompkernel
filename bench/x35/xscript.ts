import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { relayoutGlyphs } from '@/lib/omega/metathesis';
const enc='o200k_base' as any;
const SCRIPTS=process.env.SCRIPTS ? process.env.SCRIPTS.split(',') : CHIRON_SCRIPTS.map(s=>s.name);
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const base=r.messageTokens;
  const out:string[]=[];
  let best=base,bestS='(parent)';
  for(const s of SCRIPTS){
    const o:any=relayoutGlyphs(String(r.wire), t, enc, {forceScript:s} as any);
    const tot=o.tokens + countTokens(r.contract||'',enc);
    out.push(`${s}:${tot}`);
    if(tot<best){best=tot;bestS=s;}
  }
  console.log(f.split('/').pop()!.padEnd(26),'base',String(base).padStart(5),
    'BEST',String(best).padStart(5),`(${bestS})`,'delta',String(best-base).padStart(5),
    '|',out.join(' '));
}
