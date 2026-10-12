// Z31: VERITAS-U candidate-order variants on the repo's lane groups (VX level). Same files as vxu-groups.ts.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasUEncode, veritasUDecode, type VeritasUOrder } from '@/lib/omega/veritas-u';
import { veritasABest, VXA_LEGEND_V2 } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  wrapped_docs: fs.readdirSync('bench/z28/wrapped-real').map((f) => path.join('bench/z28/wrapped-real', f)),
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  ops_real: fs.readdirSync('bench/z29/ops-real').map((f) => path.join('bench/z29/ops-real', f)),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
const orders: VeritasUOrder[] = ['old', 'net', 'cw'];
const tot: Record<string, Record<string, number>> = {};
let fail = 0;
for (const [g, fl] of Object.entries(groups)) {
  tot[g] = { vxa: 0 };
  for (const o of orders) tot[g][o] = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    tot[g].vxa += veritasABest(t, enc, VXA_LEGEND_V2).outTokens;
    for (const o of orders) {
      const r = veritasUEncode(t, enc, { order: o });
      if (veritasUDecode(r.wire) !== t) fail++;
      tot[g][o] += r.outTokens;
    }
  }
}
for (const [g, v] of Object.entries(tot)) console.log(g.padEnd(13), 'VXA-best3', v.vxa, ...orders.map((o) => `${o}=${v[o] - v.vxa}`));
console.log('round-trip failures', fail);
