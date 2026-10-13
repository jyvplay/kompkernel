// VX stage only (raw text, no canonical layer): VERITAS-A with a phrase-length cap sweep. For each cap, min over W in {2,3,4}
// (same selection rule as PHALANX-A2). Decode-checked. Real files only.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasAEncode, veritasADecode, VXA_LEGEND_V2 } from '@/lib/omega/veritas-a';
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
const enc = 'o200k_base' as const;
const caps = (process.env.CAPS ?? '32,64,128,256').split(',').map(Number);
const res: Record<string, Record<number, number>> = {};
let bad = 0; let idAll = 0;
for (const [g, fl] of Object.entries(groups)) {
  res[g] = {}; for (const c of caps) res[g][c] = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    const id = countTokens(t, enc); idAll += id;
    for (const c of caps) {
      let best = id;
      for (const W of [2, 3, 4]) {
        const r = veritasAEncode(t, enc, W, VXA_LEGEND_V2, c);
        if (veritasADecode(r.wire) !== t) bad++;
        best = Math.min(best, r.outTokens);
      }
      res[g][c] += best;
    }
  }
  console.log(`${g}: ` + caps.map((c) => `cap${c}=${res[g][c]}`).join(' '));
}
const all = (c: number) => Object.values(res).reduce((s, v) => s + v[c], 0);
console.log(`ALL identity=${idAll} ` + caps.map((c) => `cap${c}=${all(c)} (${(((all(c) - all(caps[0])) / all(caps[0])) * 100).toFixed(2)}% vs cap${caps[0]})`).join(' '));
console.log(`decode failures: ${bad}`);
