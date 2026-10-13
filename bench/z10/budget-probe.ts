// Budget sensitivity of the frontier codec (DAEDALUS) on real long documents from node_modules.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const files = (process.env.FILES || '').split(',').filter(Boolean);
const budgets = (process.env.BUDGETS || '4000,20000,60000').split(',').map(Number);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const b of budgets) {
    const t0 = Date.now();
    const r = daedalusEncode(t, 'o200k_base', { budgetMs: b });
    const ms = Date.now() - t0;
    console.log(JSON.stringify({ f, chars: t.length, in: r.inTokens, msg: r.messageTokens, arm: r.arm ?? null, exact: r.exact ?? null, budgetMs: b, ms, notes: String(r.notes).slice(0, 160) }));
  }
}
