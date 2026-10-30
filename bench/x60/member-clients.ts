import * as fs from 'node:fs';
import { eirmosPlan, eirmosRestore } from '../../src/lib/omega/eirmos';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const text = fs.readFileSync('bench/x60/fixtures/clients.csv', 'utf8');
const plan = eirmosPlan(text, ENC)!;
const contractTokens = countTokens(plan.contract, ENC);
const out: any = { applied: !!plan, planExact: eirmosRestore(plan.reducedText, plan.spec) === text, contractTokens, drops: plan.spec.drops.map((d) => d.name), legs: [] };
for (const [name, enc] of [['akolouthia2', akolouthia2Encode], ['daedalus', daedalusEncode]] as const) {
  let s = Date.now(); const src: any = (enc as any)(text, ENC);
  out.legs.push({ codec: name, side: 'source', tokens: src.messageTokens, exact: src.exact && src.decoded === text, ms: Date.now() - s });
  s = Date.now(); const red: any = (enc as any)(plan.reducedText, ENC);
  out.legs.push({ codec: name, side: 'candidate', tokens: contractTokens + 1 + red.messageTokens, exact: red.exact && red.decoded === plan.reducedText, ms: Date.now() - s });
}
console.log(JSON.stringify(out, null, 1));
