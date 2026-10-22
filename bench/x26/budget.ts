import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
// Is POLYTROPOS's rule set budget-limited? If raising the budget lowers the
// wire, the search -- not the mechanism -- is the binding constraint, and a
// better search is real money on prose.
const BUDGETS = [25000, 60000, 150000];
for (const f of (process.env.F || 'bench/holdout-work/kb-article.txt').split(',')) {
  const t = fs.readFileSync(f, 'utf8');
  const base = T(t);
  const out: string[] = [];
  for (const b of BUDGETS) {
    const t0 = Date.now();
    const r: any = polytroposEncode(t, enc, { budgetMs: b });
    out.push(`budget=${(b / 1000).toFixed(0)}s wire=${T(String(r.wire))} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  console.log(f.split('/').pop()!.padEnd(38), 'raw', String(base).padStart(5), '|', out.join('  |  '));
}
