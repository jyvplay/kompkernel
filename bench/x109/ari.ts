/**
 * X109 — is ARIADNE (registry arm 1731, module present, NOT wired into tagstack)
 * competitive with the shipped chain?  Measured on the same lanes, same pinned flags.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { ariadneEncode } from '../../src/lib/omega/ariadne';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(l=>l.trim()!=='');
console.log('lane                    chain  ariadne   Δ     exact  rules  blocks  script');
let tc=0,ta=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const c:any=tagstackEncode(text,enc);
  let a:any=null; try{ a=ariadneEncode(text,enc); }catch(e:any){ console.log(`${p.split('/').pop()!.padEnd(22)} THREW ${String(e&&e.message).slice(0,40)}`); continue; }
  tc+=c.messageTokens; ta+=a.messageTokens;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(c.messageTokens).padStart(5)} ${String(a.messageTokens).padStart(8)} ${String(a.messageTokens-c.messageTokens).padStart(5)}   ${a.exact?'y':'N'}    ${String(a.rules).padStart(5)} ${String(a.blocks).padStart(6)}  ${a.script}`);
}
console.log(`\nTOTAL chain ${tc}  ariadne ${ta}  ΣΔ ${ta-tc}`);
