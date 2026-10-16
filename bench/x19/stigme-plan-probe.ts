// X19: STIGME plan probe. No DAEDALUS: measures the raw-token delta and the contract cost.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stigmePlan, stigmeForward, stigmeRestore, stigmeClusters, STIGME_SEPS, STIGME_VARIANTS, type StigmePlanOptions } from '@/lib/omega/stigme';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync('bench/x16/lanes-all.txt', 'utf8').split('\n').filter(Boolean);

const VARIANTS: Array<[string, StigmePlanOptions]> = [
  ['auto', {}],
  ['auto-k6', { maxShapes: 6 }],
  ['punct', { seps: new Set([...STIGME_SEPS]) }],
];

for (const [vname, opts] of VARIANTS) {
  let totRaw = 0, totDelta = 0, totContract = 0, totNet = 0, wins = 0, exact = 0, fail = 0;
  const rows: string[] = [];
  for (const f of lanes) {
    const text = fs.readFileSync(f, 'utf8');
    totRaw += countTokens(text, enc);
    let plan = null;
    try { plan = stigmePlan(text, enc, opts); } catch (e) { fail++; }
    if (!plan) { rows.push(`${f}\t0\t0\t0\t0\t-`); continue; }
    const tr = stigmeForward(text, plan);
    const back = stigmeRestore(tr, plan);
    if (back !== text) { fail++; rows.push(`${f}\tINEXACT`); continue; }
    exact++;
    const net = plan.rawDelta - plan.contractTokens;
    totDelta += plan.rawDelta; totContract += plan.contractTokens; totNet += net;
    if (net > 0) wins++;
    rows.push(`${f}\t${plan.rawDelta}\t${plan.contractTokens}\t${net}\t${plan.packed}/${plan.clusters}\t${plan.variant}\t${plan.uses.map(u => (u.mark || '*') + u.shape.runs.join('-')).join(' ')}`);
  }
  console.log(`=== variant ${vname} === exact=${exact} fail=${fail} wins=${wins}/${lanes.length} rawDelta=${totDelta} contract=${totContract} net=${totNet} (raw corpus ${totRaw})`);
  for (const r of rows) console.log('   ' + r);
}
