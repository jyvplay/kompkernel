import * as fs from 'node:fs';
import { bathmosPlan, bathmosRestore } from '../../src/lib/omega/bathmos';
import { countTokens } from '../../src/lib/omega/bpe';
const path = process.argv[2]!;
const text = fs.readFileSync(path, 'utf8');
const t0 = Date.now();
const plan = bathmosPlan(text, 'o200k_base');
if (!plan) { console.log(JSON.stringify({ lane: path, applied: false, ms: Date.now() - t0 })); process.exit(0); }
const exact = bathmosRestore(plan.reducedText, plan.spec) === text;
console.log(JSON.stringify({
  lane: path, applied: true, exact, ms: Date.now() - t0,
  srcTokens: countTokens(text, 'o200k_base'),
  reducedTokens: countTokens(plan.reducedText, 'o200k_base'),
  contractTokens: countTokens(plan.contract, 'o200k_base'),
  drops: plan.spec.drops.map(d => ({ name: d.headerName, family: d.family, rankKind: d.rankKind, partition: d.partition, keys: d.keys, exceptions: d.exceptions.length })),
}, null, 1));
fs.writeFileSync('/tmp/bath-contract.txt', plan.contract);
fs.writeFileSync('/tmp/bath-reduced.csv', plan.reducedText);
