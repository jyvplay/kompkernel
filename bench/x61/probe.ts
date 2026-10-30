import * as fs from 'node:fs';
import { syndesmosPlan } from '../../src/lib/omega/syndesmos';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
for(const path of process.argv.slice(2)){
 const text=fs.readFileSync(path,'utf8'); const p=syndesmosPlan(text); if(!p){console.log(JSON.stringify({path,applicable:false}));continue;}
 const d=daedalusEncode(p.transformed,'o200k_base');
 const c=countTokens(`${p.contract}\n${d.decoderPrompt}\n${d.wire}`,'o200k_base');
 const b=daedalusEncode(text,'o200k_base');
 console.log(JSON.stringify({path,chars:text.length,raw:countTokens(text,'o200k_base'),urlCount:p.urls.length,links:p.eligibleLinks,transform:countTokens(p.transformed,'o200k_base'),prompt:countTokens(`${p.contract}\n${d.decoderPrompt}`,'o200k_base'),cand:c,daedalusSource:b.messageTokens,exact:d.exact}));
}
