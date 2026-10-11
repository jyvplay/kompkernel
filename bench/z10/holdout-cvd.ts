// CHIRON vs DAEDALUS on the 43-file holdout (real files, exact decode checked). Sharded: SHARD/NSHARD.
import fs from 'node:fs';
import { chironEncode } from '@/lib/omega/chiron';
import { daedalusEncode } from '@/lib/omega/daedalus';
const files: string[] = fs.readFileSync('bench/z10/holdout43.txt', 'utf8').split('\n').filter(Boolean);
const SH = Number(process.env.SHARD || 0), NS = Number(process.env.NSHARD || 1);
const budget = Number(process.env.BUDGET || 20000);
files.forEach((f, i) => {
  if (i % NS !== SH) return;
  const t = fs.readFileSync(f, 'utf8');
  const c = chironEncode(t, 'o200k_base', { budgetMs: budget });
  const d = daedalusEncode(t, 'o200k_base', { budgetMs: budget });
  console.log(JSON.stringify({ f, in: c.inTokens, chiron_msg: c.messageTokens, chiron_exact: c.exact, dae_msg: d.messageTokens, dae_exact: d.exact, dae_mode: d.mode }));
});
