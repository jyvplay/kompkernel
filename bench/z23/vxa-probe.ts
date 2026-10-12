// VX-stage-only probe on the 21-file corpus (raw text, no other stages).
// Compares VX1 (flat VERITAS, W=3, with its legend) against VERITAS-A (one-token alias characters, with its legend).
// Every wire is decoded with its own decoder and compared byte for byte.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasEncode } from '@/lib/omega/veritas';
import { withVxLegend, veritasDecodeL } from '@/lib/omega/veritas-w';
import { veritasAEncode, veritasADecode } from '@/lib/omega/veritas-a';

const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
};
const enc = 'o200k_base' as const;
const agg: Record<string, { id: number; vx1: number; vxg: number; n: number; vxgWins: number; vx1Wins: number }> = {};
let bad = 0;
const t0 = Date.now();
for (const [g, files] of Object.entries(groups)) {
  agg[g] = { id: 0, vx1: 0, vxg: 0, n: 0, vxgWins: 0, vx1Wins: 0 };
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const id = countTokens(t, enc);
    const v1 = veritasEncode(t, enc);
    const w1 = v1.wire.startsWith('[[VX1\n') ? withVxLegend(v1.wire) : t;
    if (veritasDecodeL(w1) !== t) bad++;
    const vg = veritasAEncode(t, enc);
    if (veritasADecode(vg.wire) !== t || !vg.exact) bad++;
    const t1 = countTokens(w1, enc), tg = countTokens(vg.wire, enc);
    const A = agg[g];
    A.n++; A.id += id; A.vx1 += Math.min(t1, id); A.vxg += Math.min(tg, id);
    if (tg < t1) A.vxgWins++; else if (t1 < tg) A.vx1Wins++;
    console.log(`${g} ${path.basename(f)}: id=${id} VX1=${t1} VXA=${tg} (${tg - t1}) entries=${vg.entries.length}`);
  }
}
for (const [g, A] of Object.entries(agg)) {
  console.log(`TOTAL ${g}: n=${A.n} identity=${A.id} VX1+legend=${A.vx1} VXA+legend=${A.vxg} (VXA-VX1=${A.vxg - A.vx1}, ${(((A.vxg - A.vx1) / A.vx1) * 100).toFixed(2)}%) VXA wins ${A.vxgWins}, VX1 wins ${A.vx1Wins}`);
}
const sum = (k: 'id' | 'vx1' | 'vxg') => Object.values(agg).reduce((s, A) => s + A[k], 0);
console.log(`ALL: identity=${sum('id')} VX1=${sum('vx1')} VXA=${sum('vxg')} (VXA-VX1=${sum('vxg') - sum('vx1')})`);
console.log(`decode failures: ${bad}; elapsed ms ${Date.now() - t0}`);
console.log(bad === 0 ? 'ALL EXACT' : 'FAILURES');
