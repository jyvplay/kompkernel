/**
 * X132 — for each gaining lane report whether byte-exactness is verified
 * ABSOLUTELY (expanded message == source) or only relatively, and dump the
 * winning message so it can be handed to an LLM cold.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { eurosFromFrontier } from '../../src/lib/omega/euros';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc);
  const r:any=eurosFromFrontier(a,text,enc);
  if(!r){ console.log(`${p.split('/').pop()!.padEnd(20)} no-pay`); continue; }
  console.log(`${p.split('/').pop()!.padEnd(20)} A=${a.messageTokens} B=${r.tokens} Δ=${r.tokens-a.messageTokens} absolute=${r.absolute} invertible=${r.toFrontier(r.message)===a.message}`);
  if(process.env.DUMP==='1'){
    console.log('----- MESSAGE START -----');
    console.log(r.message);
    console.log('----- MESSAGE END -----');
  }
}
