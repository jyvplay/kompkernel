// Why does DAEDALUS return raw on micromatch? Run its arm (ARIADNE) directly with explicit budgets.
import fs from 'node:fs';
import { ariadneEncode } from '@/lib/omega/ariadne';
const f = process.env.F as string;
const t = fs.readFileSync(f, 'utf8');
for (const b of (process.env.BUDGETS || '20000').split(',').map(Number)) {
  const t0 = Date.now();
  const r: any = ariadneEncode(t, 'o200k_base', { budgetMs: b } as any);
  console.log(JSON.stringify({ f, budgetMs: b, ms: Date.now() - t0, mode: r.mode, exact: r.decoded === t, msg: r.messageTokens, wire: r.outTokens, in: r.inTokens, notes: String(r.notes).slice(0, 260) }));
}
