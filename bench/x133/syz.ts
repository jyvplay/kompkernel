import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { synarmogeFromFrontier } from '../../src/lib/omega/synarmoge';
import { eurosFromFrontier } from '../../src/lib/omega/euros';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
let A=0,B=0,C=0;
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const t=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(t,enc);
  const e:any=eurosFromFrontier(a,t,enc);
  const s:any=synarmogeFromFrontier(a,t,enc);
  A+=a.messageTokens; B+=countTokens(e?e.message:a.message,enc); C+=countTokens(s?s.message:a.message,enc);
  console.log(`${p.split('/').pop()!.padEnd(20)} A=${String(a.messageTokens).padStart(5)} EUROS=${String((e?e.tokens:a.messageTokens)-a.messageTokens).padStart(4)} SYNA=${String((s?s.tokens:a.messageTokens)-a.messageTokens).padStart(4)}  [ext${s?.extends_??0} shr${s?.shrinks??0} drop${s?.drops??0} orph${s?.orphans??0} ren${s?.renames??0} swap${s?.swaps??0} add${s?.adds??0}]`);
}
console.log(`\nA(frontier)=${A}  EUROS=${B} (${B-A})  SYNARMOGE=${C} (${C-A})`);
