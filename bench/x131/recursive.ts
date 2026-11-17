/** X131: does a SECOND full frontier pass compress the frontier's own output? */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8'); const raw=countTokens(text,enc);
  const a:any=tagstackEncode(text,enc);                 // pass 1
  const M=a.message as string;
  let b=a.messageTokens, note='no-tape', ok=a.decoded===text;
  if(a.decoded===text && M.indexOf('\u00a7')>=0){
    const c:any=tagstackEncode(M,enc);                  // pass 2 on pass-1 output
    if(c.decoded===M){ b=c.messageTokens; note=c.messageTokens<a.messageTokens?'2nd-PASS-WINS':'2nd-worse'; }
    else note='2nd-NOT-EXACT';
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} raw=${String(raw).padStart(5)}  pass1=${String(a.messageTokens).padStart(5)}  pass2=${String(b).padStart(5)}  Δ=${String(b-a.messageTokens).padStart(5)}  ${note}`);
}
