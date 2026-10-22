import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { pyknosisEncode } from '@/lib/omega/pyknosis';
import { syncopeEncode } from '@/lib/omega/syncope';
import { anadiplosisEncode, anadiplosisRoundTrip } from '@/lib/omega/anadiplosis';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  try{
    const raw=countTokens(t,enc);
    const a:any=oikonomiaEncode(t,enc);
    const b:any=pyknosisEncode(t,enc);
    const c:any=syncopeEncode(t,enc);
    const d:any=anadiplosisEncode(t,enc);
    const ok=anadiplosisRoundTrip(t,enc);
    console.log(JSON.stringify({lane:f,raw,oiko:a.messageTokens,pyk:b.messageTokens,syn:c.messageTokens,ana:d.messageTokens,
      dAnaOiko:d.messageTokens-a.messageTokens,dAnaSyn:d.messageTokens-c.messageTokens,
      fired:!!d.anadiplosis,spans:d.anadiplosisSpans,rules:d.rules,byteExact:ok}));
  }catch(e){ console.log(JSON.stringify({lane:f,err:String((e as Error).message).slice(0,90)})); }
}
