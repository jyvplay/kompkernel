// Z42: sensitivity of DAEDALUS-D output to its wall-clock budget (serial). Budgets in ms passed via env BUDGETS.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const OUT = process.env.OUT ?? '/home/user/z42/budget.jsonl';
const budgets = (process.env.BUDGETS ?? '60000,4000').split(',').map(Number);
const files = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const budgetMs of budgets) {
    const t0 = Date.now();
    const r = daedalusEncode(text, 'o200k_base', { dualTokenizer: true, budgetMs, maxArms: 1 });
    const ms = Date.now() - t0;
    const useW = r.mode === 'daedalus' && r.decoded === text;
    const o = useW ? countTokens(r.decoderPrompt, 'o200k_base') : countTokens(text, 'o200k_base');
    const c = useW ? countTokens(r.decoderPrompt, 'cl100k_base') : countTokens(text, 'cl100k_base');
    fs.appendFileSync(OUT, JSON.stringify({ f: f.split('/').slice(-2).join('/'), budgetMs, o, c, arm: r.winningArm, exact: useW || r.mode === 'raw', ms }) + '\n');
  }
}
console.log('done');
