/**
 * X109 — ΣΥΜΜΕΤΡΟΝ IN THE REGIME THE CHAIN ACTUALLY USES.
 * The chain's ΧΕΙΡΩΝ-derived arms (amphora/antiphon/...) call chironEncode with
 * workUnits = KAIROS_WORK_UNITS = 32M, i.e. HALF the 64M production envelope.
 * Measure the proxy A/B at that exact grant, and at the full envelope, on the
 * same lanes, to see whether the right default depends on the regime.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
for(const WU of [32_000_000, undefined]){
  console.log(`\n===== workUnits = ${WU===undefined?'64M (production envelope, no grant)':WU} =====`);
  console.log('lane                     charP   tokP    Δ  exactC exactT');
  let tc=0,tt=0;
  for(const p of lanes){
    const text=fs.readFileSync(p,'utf8');
    process.env.OMEGA_NO_SYMMETRON='1';
    const a:any=chironEncode(text,enc,WU===undefined?{}:{workUnits:WU});
    delete process.env.OMEGA_NO_SYMMETRON;
    const b:any=chironEncode(text,enc,WU===undefined?{}:{workUnits:WU});
    tc+=a.messageTokens; tt+=b.messageTokens;
    console.log(`${p.split('/').pop()!.padEnd(22)} ${String(a.messageTokens).padStart(6)} ${String(b.messageTokens).padStart(6)} ${String(b.messageTokens-a.messageTokens).padStart(4)}    ${a.exact?'y':'N'}     ${b.exact?'y':'N'}`);
  }
  console.log(`TOTAL char ${tc}  token ${tt}  ΣΔ(token-char) ${tt-tc}`);
}
