// VERITAS-A (VX stage only, raw text) as a function of the minimum phrase window W.
// W=3 is the committed A1 setting. W=2 mines bigram anchors (now affordable: a bigram replaced by one alias).
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasAEncode, veritasADecode } from '@/lib/omega/veritas-a';

const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
};
const enc = 'o200k_base' as const;
const Ws = [2, 3, 4];
const tot: Record<string, Record<number, number>> = {};
const minTot: Record<string, number> = {};
const idTot: Record<string, number> = {};
let bad = 0;
for (const [g, files] of Object.entries(groups)) {
  tot[g] = { 2: 0, 3: 0, 4: 0 }; idTot[g] = 0; minTot[g] = 0;
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const id = countTokens(t, enc); idTot[g] += id;
    let best = Infinity;
    for (const W of Ws) {
      const r = veritasAEncode(t, enc, W);
      if (veritasADecode(r.wire) !== t) bad++;
      tot[g][W] += Math.min(r.outTokens, id);
      best = Math.min(best, Math.min(r.outTokens, id));
    }
    minTot[g] += best;
  }
}
for (const g of Object.keys(groups)) console.log(`${g}: identity=${idTot[g]} W2=${tot[g][2]} W3=${tot[g][3]} W4=${tot[g][4]} (W2-W3=${tot[g][2] - tot[g][3]})`);
const all = (W: number) => Object.keys(groups).reduce((s, g) => s + tot[g][W], 0);
for (const g of Object.keys(groups)) console.log(`${g}: per-file min over W in {2,3,4} = ${minTot[g]} (vs W3 ${tot[g][3]}, diff ${minTot[g] - tot[g][3]})`);
console.log(`ALL: W2=${all(2)} W3=${all(3)} W4=${all(4)} (W2-W3=${all(2) - all(3)})`);
console.log(`decode failures: ${bad}`);
