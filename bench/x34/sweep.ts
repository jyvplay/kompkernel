import fs from 'node:fs';
import { pyknosisEncode, pyknosisRoundTrip } from '@/lib/omega/pyknosis';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  const name=f.split('/').slice(-2).join('/');
  try{
    const t1=Date.now(); const b:any=oikonomiaEncode(t,enc); const bms=Date.now()-t1;
    const t2=Date.now(); const r:any=pyknosisEncode(t,enc); const rms=Date.now()-t2;
    const ok=pyknosisRoundTrip(t,enc);
    const d=r.messageTokens-b.messageTokens;
    console.log(JSON.stringify({lane:name,raw:countTokens(t,enc),oiko:b.messageTokens,pyk:r.messageTokens,delta:d,
      fired:r.pyknosis,runs:r.hexRuns,chars:r.hexChars,est:r.estimatedSaving,
      oikoMs:bms,pykMs:rms,byteExact:ok,
      contract: r.pyknosis?r.contract.slice(-90):'' }));
  }catch(e:any){ console.log(JSON.stringify({lane:name,error:String(e&&e.message||e)})); }
}
