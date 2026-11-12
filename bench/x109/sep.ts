/**
 * X109 — WIDE SEPARATOR SWEEP, ΧΕΙΡΩΝ LAYER, DETERMINISTIC WORK METER.
 *
 * `chironSeparators(text, wide=false)` gates separator candidates on the
 * hand-tuned heuristic `n > nl*2`.  X101's own measurement says that gate "is
 * choosing the winner on a heuristic rather than on price" and that `wide`
 * (drop the newline comparison, add `= : . "`) is the price-based form — but
 * `wideSeparators` is read only from ChironOptions, defaults to false, and is
 * referenced nowhere outside chiron.ts, so the wide sweep has never been
 * exercised anywhere in this repository.
 *
 * Both arms get the SAME deterministic work grant (KAIROS), so the comparison
 * is work-for-work and not wall-clock-for-wall-clock.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const WU=Number(process.argv[3]??'8_000_000');
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log(`lane                     narrow  wide    Δ   msN   msW  exactN exactW  seps(narrow) -> seps(wide)`);
let tn=0,tw=0,win=0,lose=0,same=0,exN=0,exW=0,msN=0,msW=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const a:any=chironEncode(text,enc,{wideSeparators:false,workUnits:WU});
  const b:any=chironEncode(text,enc,{wideSeparators:true,workUnits:WU});
  tn+=a.messageTokens; tw+=b.messageTokens; msN+=a.ms; msW+=b.ms;
  if(a.exact)exN++; if(b.exact)exW++;
  if(b.messageTokens<a.messageTokens)win++; else if(b.messageTokens>a.messageTokens)lose++; else same++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(a.messageTokens).padStart(6)} ${String(b.messageTokens).padStart(6)} ${String(b.messageTokens-a.messageTokens).padStart(4)} ${String(a.ms).padStart(5)} ${String(b.ms).padStart(5)}    ${a.exact?'y':'N'}     ${b.exact?'y':'N'}`);
}
console.log(`\nTOTAL narrow ${tn}  wide ${tw}  ΣΔ ${tw-tn}   win ${win} lose ${lose} same ${same}   exact ${exN}/${exW} of ${lanes.length}`);
console.log(`ms narrow ${msN}  wide ${msW}  (ΣΔ ${msW-msN}, ${((msW/Math.max(1,msN)-1)*100).toFixed(1)} %)`);
