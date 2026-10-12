// Z31: the vx-parameter refactor must leave PHALANX-A7 (default vx) byte-identical. Compares to the Z30 receipt numbers.
import fs from 'node:fs';
import { phalanxA7Encode, phalanxA7Decode } from '@/lib/omega/phalanx-a7';
const cases: [string, number][] = [
  ['bench/z20/samples/ls-omega-full-iso.txt', 1584], ['bench/holdout-ops/git-numstat.txt', 2704],
  ['bench/z29/ops-real/dpkg-l.txt', 5742], ['bench/holdout/gh-prose.txt', 4532],
];
for (const [f, expect] of cases) {
  const t = fs.readFileSync(f, 'utf8');
  const r = phalanxA7Encode(t, 'o200k_base');
  console.log(f.padEnd(42), 'A7 tokens', r.outTokens, 'expected(Z30 receipt)', expect, r.outTokens === expect ? 'SAME' : 'DIFFERENT', 'exact', phalanxA7Decode(r.wire) === t);
}
