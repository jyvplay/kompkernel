import * as fs from 'node:fs';
import { syllogismosPlan, syllogismosRestore } from '../../src/lib/omega/syllogismos';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const plan = syllogismosPlan(t);
  console.log(p, 'ms', Date.now() - t0, plan ? JSON.stringify({ drops: plan.spec.drops, est: plan.estColTokensDropped, rt: syllogismosRestore(plan.reducedText, plan.spec) === t, contract: plan.contract }) : 'NO PLAN');
}
