/** X130: is the frontier number WARM-state dependent? Run each lane N times. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8'); const raw=countTokens(text,enc);
  const runs:number[]=[]; const ms:number[]=[];
  for(let r=0;r<3;r++){ const t=Date.now(); const a:any=tagstackFrontier(text,enc); ms.push(Date.now()-t); runs.push(a.messageTokens); if(a.decoded!==text) console.log('  MISMATCH!'); }
  console.log(`${p.split('/').pop()!.padEnd(20)} raw=${String(raw).padStart(4)}  runs=${runs.join(' -> ')}  ms=${ms.join('/')}  ${runs[0]!==runs[2]?'***WARM-SENSITIVE***':'stable'}`);
}
