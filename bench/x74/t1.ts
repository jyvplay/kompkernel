import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { stoicheionPlan, stoicheionDecode, stoicheionFold } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const plan = stoicheionPlan(t, enc);
  if (!plan) { console.log(`${p.split('/').pop()!.padEnd(24)} NOFOLD`); continue; }
  let ok = false, err = '';
  try { ok = stoicheionDecode(plan.message) === t; } catch (e) { err = (e as Error).message; }
  const specTok = T(plan.cols.map(c=>c.spec).join(' '), enc);
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(T(t,enc)).padStart(4)} | body ${String(plan.tokens).padStart(4)} tol ${plan.fold.tolerance} rows ${plan.fold.table.length}/${plan.fold.map.length} C=${plan.cols.length} kinds ${plan.cols.map(c=>c.kind).join('')} | exact ${ok} ${err}`);
}
