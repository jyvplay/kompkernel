import * as fs from 'node:fs';
import { eirmosPlan, eirmosRestore } from '../../src/lib/omega/eirmos';
import { countTokens } from '../../src/lib/omega/bpe';
const path = process.argv[2]!;
const text = fs.readFileSync(path, 'utf8');
const s = Date.now();
const plan = eirmosPlan(text, 'o200k_base');
console.log(JSON.stringify({
  lane: path, applied: !!plan,
  exact: plan ? eirmosRestore(plan.reducedText, plan.spec) === text : null,
  ms: Date.now() - s,
  srcTokens: countTokens(text, 'o200k_base'),
  reducedTokens: plan ? countTokens(plan.reducedText, 'o200k_base') : null,
  contractTokens: plan ? countTokens(plan.contract, 'o200k_base') : null,
  drops: plan?.spec.drops.map((d) => ({ name: d.name, parts: d.parts, exceptions: d.exceptions.length })),
}, null, 1));
if (plan) { fs.writeFileSync('/tmp/eir-contract.txt', plan.contract); fs.writeFileSync('/tmp/eir-reduced.csv', plan.reducedText); }
