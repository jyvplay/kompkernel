import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { syllogismosPlan } from '../../src/lib/omega/syllogismos';
import { apographeEncode } from '../../src/lib/omega/apographe';
const text = fs.readFileSync(process.argv[2]!, 'utf8');
const plan = syllogismosPlan(text, 'o200k_base');
const ENC = 'o200k_base' as const;
if (plan) {
  const g: any = apographeEncode(plan.reducedText, ENC);
  const msg = (g.contract ? g.contract + '\n' : '') + g.wire;
  console.log(JSON.stringify({
    contractTok: countTokens(plan.contract, ENC),
    apoReducedMsgTok: countTokens(msg, ENC),
    joinedTok: countTokens(plan.contract + '\n' + msg, ENC),
    apoContractTok: g.contract ? countTokens(g.contract, ENC) : 0,
  }, null, 2));
}
