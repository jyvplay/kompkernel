import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { syllogismosPlan } from '../../src/lib/omega/syllogismos';
for (const f of process.argv.slice(2)) {
  const plan = syllogismosPlan(fs.readFileSync(f, 'utf8'), 'o200k_base');
  console.log(f, plan ? countTokens(plan.contract, 'o200k_base') : 'NO PLAN', plan?.contract ?? '');
}
