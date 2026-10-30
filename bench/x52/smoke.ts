import * as fs from 'node:fs';
import { diptychonPlan, diptychonRestore } from '../../src/lib/omega/diptychon';
import { countTokens } from '../../src/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const plan = diptychonPlan(text);
  if (!plan) { console.log(f, 'NO PLAN'); continue; }
  const rt = diptychonRestore(plan.reducedText, plan.spec) === text;
  console.log(f, 'ms', Date.now() - t0, JSON.stringify({ format: plan.spec.format, compact: plan.spec.compact, squeeze: plan.spec.squeeze, radix: plan.spec.offsetRadix, lines: plan.dataLines, bytes: plan.totalBytes, rt, rawTok: countTokens(text, 'o200k_base'), reducedTok: countTokens(plan.reducedText, 'o200k_base'), contractTok: countTokens(plan.contract, 'o200k_base') }));
  console.log('  contract:', plan.contract);
}
