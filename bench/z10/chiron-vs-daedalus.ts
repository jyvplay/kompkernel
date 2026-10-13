// Selector gap probe: CHIRON (full sweep) vs DAEDALUS (predicted arm) on the same real documents.
import fs from 'node:fs';
import { chironEncode } from '@/lib/omega/chiron';
import { daedalusEncode } from '@/lib/omega/daedalus';
const files = (process.env.FILES || '').split(',').filter(Boolean);
const budget = Number(process.env.BUDGET || 20000);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const c = chironEncode(t, 'o200k_base', { budgetMs: budget });
  const t1 = Date.now();
  const d = daedalusEncode(t, 'o200k_base', { budgetMs: budget });
  const t2 = Date.now();
  console.log(JSON.stringify({ f, in: c.inTokens, chiron_msg: c.messageTokens, chiron_exact: c.exact, chiron_ms: t1 - t0, dae_msg: d.messageTokens, dae_exact: d.exact, dae_ms: t2 - t1, dae_mode: d.mode }));
}
