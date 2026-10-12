// PHALANX-A5 vs PHALANX-A4 vs identity over the corpus (real files), plus the wrapped real documents, plus edge cases.
// Every A5 wire is decoded and compared byte-for-byte.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA4Encode } from '@/lib/omega/phalanx-a4';
import { phalanxA5Encode, phalanxA5Decode } from '@/lib/omega/phalanx-a5';
const enc = 'o200k_base' as const;
const groups: Record<string, string[]> = {
  prose: ['bench/holdout/gh-prose.txt', 'bench/holdout/readme.txt', 'bench/holdout/license.txt', 'bench/holdout/lic-mit.txt', 'bench/holdout/md-react.txt', 'bench/holdout/md-vite.txt'],
  wrapped_docs: fs.readdirSync('bench/z28/wrapped-real').map((f) => path.join('bench/z28/wrapped-real', f)),
  code: ['bench/holdout/code-ts.txt', 'bench/holdout/code-dts.txt', 'bench/holdout/json-pkg.txt', 'bench/holdout/gh-api.json.txt'],
  ops: fs.readdirSync('bench/holdout-ops').map((f) => path.join('bench/holdout-ops', f)).concat(fs.readdirSync('bench/z20/samples').map((f) => path.join('bench/z20/samples', f))),
  realjson: fs.readdirSync('bench/z25/json-real').map((f) => path.join('bench/z25/json-real', f)),
};
let n = 0, fail = 0;
const tot: Record<string, [number, number, number]> = {};
const edge: [string, string][] = [
  ['empty', ''], ['prefixed-wrp', '[[WRP\nhello world'], ['keep char present', '¶ long line '.repeat(12) + '\n'],
  ['long single line', 'x '.repeat(80) + 'end\n'], ['wrapped para', Array.from({ length: 6 }, () => 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda').join('\n') + '\n'],
  ['blank lines', 'a b\n\n\nc d e\nf g\n\n'], ['tabs', 'a\tb c\nd\te f g\n'],
];
for (const [g, fl] of Object.entries(groups)) {
  let id = 0, a4 = 0, a5 = 0;
  for (const f of fl) {
    const t = fs.readFileSync(f, 'utf8');
    const r = phalanxA5Encode(t, enc); n++;
    if (phalanxA5Decode(r.wire) !== t) { fail++; console.log('FAIL', f); }
    id += countTokens(t, enc); a4 += phalanxA4Encode(t, enc).outTokens; a5 += r.outTokens;
    if (r.layer === 'wrp') console.log(`  wrap layer used: ${path.basename(f)} W=${r.width} A4=${phalanxA4Encode(t, enc).outTokens} A5=${r.outTokens}`);
  }
  tot[g] = [id, a4, a5];
  console.log(`${g}: identity=${id} A4=${a4} A5=${a5} (A5-A4=${a5 - a4})`);
}
const sum = (k: number) => Object.values(tot).reduce((s, v) => s + v[k], 0);
console.log(`ALL: identity=${sum(0)} A4=${sum(1)} A5=${sum(2)} (A5-A4=${sum(2) - sum(1)}, ${(((sum(2) - sum(1)) / sum(1)) * 100).toFixed(2)}%)`);
for (const [label, t] of edge) {
  const r = phalanxA5Encode(t, enc); n++;
  if (phalanxA5Decode(r.wire) !== t) { fail++; console.log('FAIL edge', label); }
  console.log(`edge ${label}: layer=${r.layer} W=${r.width} A4=${phalanxA4Encode(t, enc).outTokens} A5=${r.outTokens} exact=${r.exact}`);
}
console.log(`round-trip checks run: ${n}; failures: ${fail}`);
