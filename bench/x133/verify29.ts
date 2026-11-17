/**
 * X133 — the wired-stack confirmation: 29 lanes, OMEGA_DET=1, with and without
 * ΣΥΝΑΡΜΟΓΗ, reporting tokens, byte-exactness and wall clock for each.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const f=fs.openSync('bench/x133/receipts/x133-verify29.jsonl','w');
let SA=0,SB=0,RAW=0,badA=0,badB=0,mA=0,mB=0;
for(const p of lanes){
  const t=fs.readFileSync(p,'utf8');
  const raw=countTokens(t,enc);
  let t0=Date.now(); process.env.OMEGA_NO_SYNARMOGE='1';
  const a:any=tagstackEncode(t,enc); const msA=Date.now()-t0;
  t0=Date.now(); delete process.env.OMEGA_NO_SYNARMOGE;
  const b:any=tagstackEncode(t,enc); const msB=Date.now()-t0;
  SA+=a.messageTokens; SB+=b.messageTokens; RAW+=raw; mA+=msA; mB+=msB;
  if(a.decoded!==t) badA++; if(b.decoded!==t) badB++;
  fs.writeSync(f,JSON.stringify({path:p,raw,A:a.messageTokens,B:b.messageTokens,msA,msB,
    exactA:a.decoded===t,exactB:b.decoded===t,parent:b.parentCodec})+'\n');
  console.log(`${p.split('/').pop()!.padEnd(20)} raw=${String(raw).padStart(5)} A=${String(a.messageTokens).padStart(5)} B=${String(b.messageTokens).padStart(5)} Δ=${String(b.messageTokens-a.messageTokens).padStart(4)}  ${String(msA).padStart(6)}ms->${String(msB).padStart(6)}ms  exact=${b.decoded===t?'y':'N'}`);
}
console.log(`\nSIGMA raw=${RAW}  A(no SYNA)=${SA}  B(SYNA)=${SB}  ΣΔ=${SB-SA}   exact: A bad=${badA} B bad=${badB}`);
console.log(`WALL CLOCK  A=${mA}ms  B=${mB}ms  overhead=${((mB-mA)/mA*100).toFixed(2)}%`);
