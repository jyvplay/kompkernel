/**
 * X129 — ΣΥΓΚΌΛΛΗΣΙΣ as a POST-STAGE: sygkollesis(tagstackFrontier(src).message).
 * Pre-stage lost (ΣΔ +2190) because glyphing destroys the structure the X-chain
 * exploits. Post-stage only rewrites residual text the chain left literal.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { sygkollesisEncode, sygkollesisResetProbes } from '../../src/lib/omega/sygkollesis';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=(process.env.LANES??'').split(',').filter(Boolean);
let A=0,B=0,better=0,worse=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const t1=Date.now(); const a:any=tagstackFrontier(text,enc); const ms=Date.now()-t1;
  let bTok=a.messageTokens, note='syg:nopay', exact=(a.decoded===text);
  try{
    const s=sygkollesisEncode(a.message as string, enc);
    if(s){ bTok=s.tokens; exact=(s.decode(s.message)===a.message)&&(a.decoded===text); note=`syg:K=${s.k},m=${s.mergeScore}`; }
  }catch(e:any){ note='syg:THREW '+String(e.message).slice(0,26); }
  const d=bTok-a.messageTokens; A+=a.messageTokens; B+=bTok;
  if(d<0)better++; if(d>0)worse++;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(countTokens(text,enc)).padStart(5)}  A ${String(a.messageTokens).padStart(5)}  B(post) ${String(bTok).padStart(5)}  Δ ${String(d).padStart(5)}  ${note.padEnd(16)} exact ${exact?'y':'N'}  ${ms}ms`);
  sygkollesisResetProbes();
}
console.log(`\nPOST-STAGE   A ${A}   B ${B}   ΣΔ ${B-A}   better ${better} worse ${worse}`);
