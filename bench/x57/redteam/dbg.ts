import * as fs from 'node:fs';
// @ts-ignore private access via dynamic import of compiled module internals is
// not available; instead replicate: use syzygiaPlan + token counts.
import { syzygiaPlan, syzygiaRestore } from '../../../src/lib/omega/syzygia';
import { countTokens } from '../../../src/lib/omega/bpe';
for (const name of process.argv.slice(2)) {
  const text = fs.readFileSync(`bench/x57/redteam/cases/${name}.csv`, 'utf8');
  const plan = syzygiaPlan(text, 'o200k_base');
  console.log(name, 'srcTok', countTokens(text, 'o200k_base'), 'plan', !!plan,
    plan ? { contract: countTokens(plan.contract, 'o200k_base'), reduced: countTokens(plan.reducedText, 'o200k_base') } : '');
}
