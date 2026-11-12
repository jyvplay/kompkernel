/**
 * X110 — IS ΧΕΙΡΩΝ's FULL SWEEP COMPETITIVE AT THE FRONTIER?
 * tagstackFrontier's parents never call chironEncode. This measures the full
 * ΧΕΙΡΩΝ sweep (default options: separator sweep + both proxies + meter-gated
 * exactAccept) against the shipped frontier on the same lanes.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                     frontier  chiron    Δ   winner');
let tf=0,tc=0,win=0,lose=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const f:any=tagstackFrontier(text,enc);
  const c:any=chironEncode(text,enc);
  tf+=f.messageTokens; tc+=c.messageTokens;
  if(c.messageTokens<f.messageTokens)win++; else if(c.messageTokens>f.messageTokens)lose++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(f.messageTokens).padStart(8)} ${String(c.messageTokens).padStart(8)} ${String(c.messageTokens-f.messageTokens).padStart(4)}   ${c.messageTokens<f.messageTokens?'CHIRON':(c.messageTokens===f.messageTokens?'tie':'frontier')}`);
}
console.log(`\nTOTAL frontier ${tf}  chiron ${tc}  ΣΔ ${tc-tf}   chiron wins ${win} loses ${lose}`);
