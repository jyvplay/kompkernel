/**
 * X109 — ΣΥΜΜΕΤΡΟΝ A/B: rank macro candidates by TOKEN span length, not CHARACTER length.
 *
 * Both arms get the SAME deterministic work grant (KAIROS work meter), so the
 * comparison is work-for-work.  The flag is read live per call, so it is flipped
 * between the two chironEncode calls in this one process.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const WU=process.argv[3]?Number(process.argv[3]):undefined;
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                     charP   tokP    Δ   workN  workW  exactN exactW  candsN candsW');
let tn=0,tw=0,win=0,lose=0,same=0,exN=0,exW=0,wn=0,ww=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  process.env.OMEGA_NO_SYMMETRON='1';
  const a:any=chironEncode(text,enc,{workUnits:WU});
  delete process.env.OMEGA_NO_SYMMETRON;
  const b:any=chironEncode(text,enc,{workUnits:WU});
  tn+=a.messageTokens; tw+=b.messageTokens; wn+=a.work??0; ww+=b.work??0;
  if(a.exact)exN++; if(b.exact)exW++;
  if(b.messageTokens<a.messageTokens)win++; else if(b.messageTokens>a.messageTokens)lose++; else same++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(a.messageTokens).padStart(6)} ${String(b.messageTokens).padStart(6)} ${String(b.messageTokens-a.messageTokens).padStart(4)} ${String(a.work??0).padStart(6)} ${String(b.work??0).padStart(6)}    ${a.exact?'y':'N'}     ${b.exact?'y':'N'}   ${String(a.rules).padStart(5)} ${String(b.rules).padStart(5)}`);
}
console.log(`\nTOTAL char-proxy ${tn}  token-proxy ${tw}  ΣΔ ${tw-tn}   win ${win} lose ${lose} same ${same}   exact ${exN}/${exW} of ${lanes.length}`);
console.log(`work units char ${wn}  token ${ww}`);
