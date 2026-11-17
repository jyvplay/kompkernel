import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { enkibotismosEncode } from '../../src/lib/omega/enkibotismos';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc);
  try{
    const r=enkibotismosEncode(text,enc);
    if(!r){ console.log(`${p.split('/').pop()!.padEnd(20)} A=${a.messageTokens} no-pay  exact=${a.decoded===text}`); continue; }
    const inv = r.toFrontier(r.message)===a.message;
    console.log(`${p.split('/').pop()!.padEnd(20)} A=${String(a.messageTokens).padStart(4)} B=${String(r.tokens).padStart(4)} Δ=${String(r.tokens-a.messageTokens).padStart(3)} rules ${r.rulesBefore}->${r.rulesAfter} orph-${r.orphansDropped} once-${r.prunedSingleUse} refs+${r.refsAdded} invertible=${inv} decoded=${a.decoded===text}`);
  }catch(e:any){ console.log(`${p.split('/').pop()!.padEnd(20)} A=${a.messageTokens} THREW ${String(e.message).slice(0,50)}`); }
}
