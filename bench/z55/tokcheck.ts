// z55: cross-check the fast countTokens against the exact encoder on the reported messages.
import fs from 'node:fs';
import { countTokens, countTokensExact } from '@/lib/omega/bpe';
const files = ['bench/z55/incontext/message3.txt', 'bench/z55/incontext/sample3.txt', 'bench/z55/lanes/tree-src.txt', 'bench/holdout-mk/chart.svg', 'bench/holdout-tbl/df-h.txt', 'bench/holdout-tab/vix-daily-1990.csv'];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  console.log(JSON.stringify({ f, fast: countTokens(t, 'o200k_base'), exact: countTokensExact(t, 'o200k_base') }));
}
