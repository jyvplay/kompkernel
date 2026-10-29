import * as fs from 'node:fs';
import { syzygiaPlan, syzygiaRestore } from '../../../src/lib/omega/syzygia';
import { countTokens } from '../../../src/lib/omega/bpe';
for (const path of process.argv.slice(2)) {
  const text = fs.readFileSync(path, 'utf8');
  const plan = syzygiaPlan(text, 'o200k_base');
  console.log(path, 'plan', !!plan, plan ? { exact: syzygiaRestore(plan.reducedText, plan.spec) === text, drops: plan.spec.drops.length, score: countTokens(plan.contract,'o200k_base')+countTokens(plan.reducedText,'o200k_base'), src: countTokens(text,'o200k_base') } : '');
}
