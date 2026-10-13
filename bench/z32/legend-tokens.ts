// Z32: token cost of the legend lines (counted once per dictionary document).
import { countTokens } from '@/lib/omega/bpe';
import { VXA_LEGEND_V2 } from '@/lib/omega/veritas-a';
import { VXN_LEGEND } from '@/lib/omega/veritas-n';
const cands: [string, string][] = [
  ['VXA_LEGEND_V2 (VERITAS-U, A8)', VXA_LEGEND_V2],
  ['VXN_LEGEND (VERITAS-N, A9)', VXN_LEGEND],
  ['VXN short A', '# VXN: X=T; bare X means T; T may use other X; ~~ is ~; ~N newline ~R CR; header ends ]]'],
  ['VXN short B', '# VXN: X=T, bare X means T (T may use other X); ~~ is ~; ~N newline; header ends ]]'],
];
for (const [n, s] of cands) console.log(String(countTokens(s, 'o200k_base')).padStart(4), n, JSON.stringify(s));
