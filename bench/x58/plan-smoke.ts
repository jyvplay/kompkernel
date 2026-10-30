import * as fs from 'node:fs';
import { zygonPlan, zygonRestore } from '../../src/lib/omega/zygon';
import { countTokens } from '../../src/lib/omega/bpe';
const [lane] = process.argv.slice(2) as [string];
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const plan = zygonPlan(text, 'o200k_base');
if (!plan) { console.log(JSON.stringify({ lane, applied: false, ms: Date.now() - t0 })); process.exit(0); }
const restored = zygonRestore(plan.reducedText, plan.spec);
console.log(JSON.stringify({
  lane, applied: true, exact: restored === text, ms: Date.now() - t0,
  srcTokens: countTokens(text, 'o200k_base'),
  reducedTokens: countTokens(plan.reducedText, 'o200k_base'),
  contractTokens: countTokens(plan.contract, 'o200k_base'),
  drops: plan.spec.drops.map((d) => ({ name: d.headerName, col: d.col + 1, terms: d.terms.length, mode: d.mode, exceptions: d.exceptions.length })),
}, null, 1));
fs.writeFileSync('/tmp/zyg-contract.txt', plan.contract);
fs.writeFileSync('/tmp/zyg-reduced.csv', plan.reducedText);
