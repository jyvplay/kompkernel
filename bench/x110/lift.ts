/**
 * X110 — IS APOGRAPHE'S COLUMN LIFTING ACTUALLY FIRING?
 * apographeEncode exposes apographeArity / apographeModelled / apographeLiteral /
 * apographeLifts / apographeProxyGain. If most lines stay LITERAL the lift is not
 * firing and that is the headroom.
 */
import * as fs from 'node:fs';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
console.log('lane                     M   exact  arity  modelled  literal  lifts  proxyGain  parentTok');
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const r:any=apographeEncode(text,enc);
  let exact=false; try{ exact=apographeDecodeResult(r)===text; }catch{}
  const g=(k:string)=>r[k];
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(r.messageTokens).padStart(4)}  ${exact?'y':'N'}   ${String(g('apographeArity')??'-').padStart(5)} ${String(g('apographeModelled')??'-').padStart(9)} ${String(g('apographeLiteral')??'-').padStart(8)} ${String(g('apographeLifts')??'-').padStart(6)} ${String(g('apographeProxyGain')??'-').padStart(10)} ${String(g('apographeParentTokens')??'-').padStart(9)}`);
}
