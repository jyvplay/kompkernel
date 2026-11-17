/**
 * X132 — cost of applying ΕΥΡΟΣ on top of the frontier.
 *   path 1 (naive):  eurosEncode(text)                 -> 2 frontier encodes
 *   path 2 (shared): eurosFromFrontier(frontier, text) -> 1 frontier encode
 * Both must produce the SAME message (asserted).
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { eurosEncode, eurosFromFrontier } from '../../src/lib/omega/euros';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=(process.env.LANES?process.env.LANES.split(','):[]).filter(Boolean);
let tA=0,tB=0,same=0,diff=0,nA=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  let t0=Date.now(); const a:any=tagstackEncode(text,enc); const encMs=Date.now()-t0;
  t0=Date.now(); const r1:any=eurosEncode(text,enc); const naiveMs=Date.now()-t0;
  t0=Date.now(); const r2:any=eurosFromFrontier(a,text,enc); const sharedMs=Date.now()-t0;
  tA+=naiveMs; tB+=sharedMs; nA+=encMs;
  const m1=r1?r1.message:a.message, m2=r2?r2.message:a.message;
  if(m1===m2) same++; else diff++;
  console.log(`${p.split('/').pop()!.padEnd(20)} encode=${String(encMs).padStart(6)}ms  naive(eurosEncode)=${String(naiveMs).padStart(6)}ms  shared(eurosFromFrontier)=${String(sharedMs).padStart(6)}ms  same=${m1===m2?'y':'N'}`);
}
console.log(`\nTOTALS: frontier encodes ${nA}ms | naive codec path ${tA}ms | shared codec path ${tB}ms`);
console.log(`SPEEDUP of adopting the codec: ${(100*(1-(nA+tB)/(nA+tA))).toFixed(1)}% cheaper  (same output ${same}, differing ${diff})`);
