import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { eurosEncode } from '../../src/lib/omega/euros';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  let t0=Date.now(); const a:any=tagstackEncode(text,enc); const encMs=Date.now()-t0;
  // cost of countTokens on UNIQUE strings (what probes actually do)
  const M=a.message as string;
  t0=Date.now(); for(let i=0;i<200;i++) countTokens(M.slice(0,M.length-1)+String.fromCharCode(97+(i%26)),enc);
  const uniqMs=(Date.now()-t0)/200;
  t0=Date.now(); const r:any=eurosEncode(text,enc); const euMs=Date.now()-t0;
  console.log(`${p.split('/').pop()!.padEnd(20)} encode=${String(encMs).padStart(6)}ms countTokens(unique)=${uniqMs.toFixed(2)}ms euros=${String(euMs).padStart(6)}ms  A=${a.messageTokens} B=${r?r.tokens:a.messageTokens} Δ=${r?r.tokens-a.messageTokens:0} probes=${r?r.probes:0} absolute=${r?r.absolute:'-'}`);
}
