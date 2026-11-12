/**
 * X109 — ΣΥΜΜΕΤΡΟΝ CHAIN-LEVEL A/B + PROOF THE NEW VARIANT FIRES.
 * Arm A: OMEGA_NO_SYMMETRON=1 (character proxy only, no full-sym variants).
 * Arm B: default (character proxy base + meter-gated token-proxy variants).
 * Reports the winning variant tag so a null result cannot be mistaken for a
 * gate that never fired.
 */
import * as fs from 'node:fs';
import { chironEncode, chironDecode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                     charOnly  swept    Δ   exact  decode  tagB');
let ta=0,tb=0,win=0,lose=0,same=0,symWon=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  process.env.OMEGA_NO_SYMMETRON='1';
  const a:any=chironEncode(text,enc);
  delete process.env.OMEGA_NO_SYMMETRON;
  const b:any=chironEncode(text,enc);
  const dec = chironDecode(b.wire)===text;
  ta+=a.messageTokens; tb+=b.messageTokens;
  if(b.messageTokens<a.messageTokens)win++; else if(b.messageTokens>a.messageTokens)lose++; else same++;
  const m=/variant=([^;]+)/.exec(b.notes??''); const tag=m?m[1]:'?';
  if(tag.startsWith('full-sym'))symWon++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(a.messageTokens).padStart(8)} ${String(b.messageTokens).padStart(7)} ${String(b.messageTokens-a.messageTokens).padStart(4)}    ${a.exact&&b.exact?'y':'N'}     ${dec?'y':'N'}   ${tag}`);
}
console.log(`\nTOTAL char-only ${ta}  swept ${tb}  ΣΔ ${tb-ta}   win ${win} lose ${lose} same ${same}`);
console.log(`full-sym variants WON on ${symWon}/${lanes.length} lanes (0 would mean the gate never fired)`);
