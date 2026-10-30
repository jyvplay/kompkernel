import * as fs from 'node:fs';
import { bathmosPlan, bathmosRestore } from '../../src/lib/omega/bathmos';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const text = fs.readFileSync('bench/x58/fixtures/ewf-standings.csv', 'utf8');
const plan = bathmosPlan(text, ENC)!;
const contractTokens = countTokens(plan.contract, ENC);
const out: any = { applied: !!plan, planExact: bathmosRestore(plan.reducedText, plan.spec) === text, contractTokens, legs: [] };
for (const [name, enc] of [['akolouthia2', akolouthia2Encode], ['daedalus', daedalusEncode]] as const) {
  let s = Date.now(); const src: any = (enc as any)(text, ENC);
  out.legs.push({ codec: name, side: 'source', tokens: src.messageTokens, exact: src.exact && src.decoded === text, ms: Date.now() - s });
  s = Date.now(); const red: any = (enc as any)(plan.reducedText, ENC);
  out.legs.push({ codec: name, side: 'candidate', tokens: contractTokens + 1 + red.messageTokens, exact: red.exact && red.decoded === plan.reducedText, ms: Date.now() - s });
}
console.log(JSON.stringify(out, null, 1));
