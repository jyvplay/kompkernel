// VERITAS-A best-of-W (committed) vs the same with the deterministic prune pass (VERITAS-P), VX stage only, raw text.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasABest, veritasADecode, veritasAEncode } from '@/lib/omega/veritas-a';
import { veritasAPrune } from './experiments/veritas-p';
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
const enc = 'o200k_base' as const;
const agg: Record<string, { id: number; a: number; p: number; pWins: number; aWins: number }> = {};
let bad = 0;
for (const [g, files] of Object.entries(groups)) {
  agg[g] = { id: 0, a: 0, p: 0, pWins: 0, aWins: 0 };
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const id = countTokens(t, enc);
    const a = Math.min(veritasABest(t, enc).outTokens, id);
    let p = Infinity;
    for (const W of [3, 2, 4]) {
      const r = veritasAPrune(t, enc, W);
      if (veritasADecode(r.wire) !== t) bad++;
      p = Math.min(p, r.outTokens);
    }
    p = Math.min(p, id);
    const A = agg[g]; A.id += id; A.a += a; A.p += p;
    if (p < a) A.pWins++; else if (a < p) A.aWins++;
  }
  console.log(`${g}: identity=${agg[g].id} VXA-best=${agg[g].a} VXA-P=${agg[g].p} (P-A=${agg[g].p - agg[g].a}) P wins ${agg[g].pWins}, A wins ${agg[g].aWins}`);
}
const sum = (k: 'id' | 'a' | 'p') => Object.values(agg).reduce((s, A) => s + A[k], 0);
console.log(`ALL: identity=${sum('id')} VXA-best=${sum('a')} VXA-P=${sum('p')} (P-A=${sum('p') - sum('a')}, ${(((sum('p') - sum('a')) / sum('a')) * 100).toFixed(2)}%)`);
console.log(`decode failures: ${bad}`);
