// Rule-line overhead of PHALANX-P3: tokens spent on each stage's self-describing rule line, when that stage applied.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx3Encode } from '@/lib/omega/phalanx3';
import { DITTO_RULE } from '@/lib/omega/ditto';
import { DIRFOLD_A_RULE } from '@/lib/omega/dirfold-a';
import { UUIDFOLD_RULE } from '@/lib/omega/uuidfold';
import { KOINE_HEADER } from '@/lib/omega/koine';
import { RECALL_HEADER } from '@/lib/omega/recall';
const T = (s: string) => countTokens(s, 'o200k_base');
const rules: [string, string][] = [['DITTO', DITTO_RULE], ['DIRFOLD-A', DIRFOLD_A_RULE], ['UUIDFOLD', UUIDFOLD_RULE], ['KOINE', KOINE_HEADER], ['RECALL', RECALL_HEADER]];
console.log('rule text tokens:', rules.map(([n, r]) => `${n}=${T(r)}`).join(' '));
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
  ...fs.readdirSync('bench/z20/samples').map(f => `bench/z20/samples/${f}`),
];
let sumWire = 0, sumRule = 0, sumVX = 0;
for (const f of files) {
  const w = phalanx3Encode(fs.readFileSync(f, 'utf8'), 'o200k_base').wire;
  const present = rules.filter(([, r]) => w.includes(r)).map(([n]) => n);
  const ruleTok = rules.filter(([, r]) => w.includes(r)).reduce((a, [, r]) => a + T(r) + 1, 0);
  const wt = T(w);
  sumWire += wt; sumRule += ruleTok;
  console.log(`${f.replace(/^bench\//, '')}: wire=${wt} ruleLines=${ruleTok} (${(100 * ruleTok / wt).toFixed(1)}%) present=[${present.join(',')}]`);
}
console.log(`TOTAL wire=${sumWire} ruleLines=${sumRule} (${(100 * sumRule / sumWire).toFixed(1)}%)`);
