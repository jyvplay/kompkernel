// Z31: VERITAS-U vs VERITAS-A best-of-3 (the VX stage alone, both with the same VXA decoder) on the repo's existing lane groups
// (the same file groups as bench/z30/a7-roundtrip.ts). Exact decode checked for every file.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { veritasUEncode, veritasUDecode } from '@/lib/omega/veritas-u';
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
let fail = 0, n = 0;
for (const [g, fl] of Object.entries(groups)) {
  let id = 0, a = 0, u = 0, better = 0, worse = 0, eq = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    const ra = veritasABest(t, enc, VXA_LEGEND_V2);
    const ru = veritasUEncode(t, enc);
    n++;
    if (veritasUDecode(ru.wire) !== t) { fail++; console.log('FAIL', f); }
    id += countTokens(t, enc); a += ra.outTokens; u += ru.outTokens;
    if (ru.outTokens < ra.outTokens) better++; else if (ru.outTokens > ra.outTokens) worse++; else eq++;
  }
  console.log(`${g.padEnd(13)} identity=${id} VXA-best3=${a} VERITAS-U=${u} delta=${u - a} (${a ? (((u - a) / a) * 100).toFixed(2) : '0.00'}%) files better=${better} worse=${worse} equal=${eq}`);
}
console.log(`round-trip checks ${n}, failures ${fail}`);
