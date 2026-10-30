// X57 SYZYGIA plan smoke: syzygiaPlan + restore byte-check, no parents.
import * as fs from 'node:fs';
import { syzygiaPlan, syzygiaRestore } from '../../src/lib/omega/syzygia';
import { countTokens } from '../../src/lib/omega/bpe';
const [lane] = process.argv.slice(2) as [string];
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const plan = syzygiaPlan(text, 'o200k_base');
if (!plan) { console.log(JSON.stringify({ lane, applied: false, ms: Date.now() - t0 })); process.exit(0); }
const restored = syzygiaRestore(plan.reducedText, plan.spec);
console.log(JSON.stringify({
  lane, applied: true, exact: restored === text, ms: Date.now() - t0,
  srcTokens: countTokens(text, 'o200k_base'),
  reducedTokens: countTokens(plan.reducedText, 'o200k_base'),
  contractTokens: countTokens(plan.contract, 'o200k_base'),
  drops: plan.spec.drops.map((d) => ({
    tgt: d.col + 1, src: d.src + 1, a: `${d.a.p}/${d.a.q}`, b: `${d.b.p}/${d.b.q}`, mode: d.mode,
    exact: d.residuals === null,
    nonzeroResid: d.residuals ? [...d.residuals].filter((c) => c !== '.').length : 0,
  })),
}, null, 1));
fs.writeFileSync('/tmp/syz-contract.txt', plan.contract);
fs.writeFileSync('/tmp/syz-reduced.csv', plan.reducedText);
