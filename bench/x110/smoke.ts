/**
 * X110 — ΜΕΣΟΝ smoke: does the widened separator detector fire, and is it exact?
 * Compares the shipped APOGRAPHE message against ΜΕΣΟΝ's on the same lanes.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { mesonEncode } from '../../src/lib/omega/meson';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                     apogr  meson    Δ   exact  arity modelled lifts  sep');
let ta=0,tm=0,win=0,lose=0,ex=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const a:any=apographeEncode(text,enc);
  const aM=countTokens((a.contract?a.contract+'\n':'')+a.wire,enc);
  const m=mesonEncode(text,enc);
  let aEx=false; try{ aEx=apographeDecodeResult(a)===text; }catch{}
  ta+=aM; tm+=m.messageTokens;
  if(m.messageTokens<aM)win++; else if(m.messageTokens>aM)lose++;
  if(m.exact)ex++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(aM).padStart(5)} ${String(m.messageTokens).padStart(6)} ${String(m.messageTokens-aM).padStart(4)}   ${m.exact?'y':'N'}   ${String(m.arity).padStart(5)} ${String(m.modelled).padStart(8)} ${String(m.lifts).padStart(5)}  ${JSON.stringify(m.sep)}`);
}
console.log(`\nTOTAL apographe ${ta}  meson ${tm}  ΣΔ ${tm-ta}   win ${win} lose ${lose}   exact ${ex}/${lanes.length}`);
