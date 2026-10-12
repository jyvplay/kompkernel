// PHALANX-A6 vs PHALANX-A5 (committed) over the corpus groups and the real ops outputs, plus adversarial table edge cases.
// Every A6 wire is decoded and compared byte-for-byte. Tokens are o200k.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA5Encode } from '@/lib/omega/phalanx-a5';
import { phalanxA6Encode, phalanxA6Decode } from '@/lib/omega/phalanx-a6';
const enc = 'o200k_base' as const;
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  wrapped_docs: fs.readdirSync('bench/z28/wrapped-real').map((f) => path.join('bench/z28/wrapped-real', f)),
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  ops_real: fs.readdirSync('bench/z29/ops-real').map((f) => path.join('bench/z29/ops-real', f)),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
let n = 0, fail = 0;
const tot: Record<string, [number, number, number]> = {};
const edge: [string, string][] = [
  ['empty', ''], ['one table', 'A   B\n1  22\n333 4\n'], ['ragged', 'a b c\nd e\nf g h\n'],
  ['leading pad right', '   1 abc\n  22 de\n 333 f\n'], ['trailing spaces', 'a  b  \nc  d  \n'],
  ['tabs', 'a\tb c\nd e f\n'], ['marker in input', '▤ x  y\n1  2\n3  4\n'],
  ['prefixed', '[[PAD\nname  size\nfoo   12\nbarbaz 3\n'], ['numeric mix', 'x  10K\ny  2.5M\nz  -\n'],
  ['one-space columns', 'a b\nc d\n'], ['overflow push', 'AA  1  x\nB  1234567890  yy\nCC  7  zzz\n'], ['header differs', 'NAME   VAL\nalpha    1\nbeta     22\n'], ['ls-like', '-rw-r--r-- 1 u g 4096 Oct  9 03:24 a\n-rw-r--r-- 1 u g  12 Oct 12 03:24 bb\n'],
];
for (const [g, fl] of Object.entries(groups)) {
  let id = 0, a5 = 0, a6 = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    const r = phalanxA6Encode(t, enc); n++;
    if (phalanxA6Decode(r.wire) !== t) { fail++; console.log('FAIL', f); }
    id += countTokens(t, enc); a5 += phalanxA5Encode(t, enc).outTokens; a6 += r.outTokens;
    if (r.layer === 'pad') console.log(`  table layer used: ${path.basename(f)} A5=${phalanxA5Encode(t, enc).outTokens} A6=${r.outTokens}`);
  }
  tot[g] = [id, a5, a6];
  console.log(`${g}: identity=${id} A5=${a5} A6=${a6} (A6-A5=${a6 - a5})`);
}
const sum = (k: number) => Object.values(tot).reduce((s, v) => s + v[k], 0);
console.log(`ALL: identity=${sum(0)} A5=${sum(1)} A6=${sum(2)} (A6-A5=${sum(2) - sum(1)}, ${(((sum(2) - sum(1)) / sum(1)) * 100).toFixed(2)}%)`);
for (const [label, t] of edge) {
  const r = phalanxA6Encode(t, enc); n++;
  if (phalanxA6Decode(r.wire) !== t) { fail++; console.log('FAIL edge', label); }
  console.log(`edge ${label}: layer=${r.layer} A5=${phalanxA5Encode(t, enc).outTokens} A6=${r.outTokens} exact=${r.exact}`);
}
console.log(`round-trip checks run: ${n}; failures: ${fail}`);
