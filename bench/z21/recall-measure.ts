// Measure: fields that equal the same-numbered field of a NON-adjacent earlier line (window W),
// i.e. redundancy DITTO (line above only) does not see. o200k_base. Counts only; no codec yet.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
  ...fs.readdirSync('bench/z20/samples').map(f => `bench/z20/samples/${f}`),
];
const W = 32;
let tot = { fields: 0, adjacentEq: 0, farEq: 0, farTok: 0 };
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hist: string[][] = [];
  let adj = 0, far = 0, farTok = 0, fields = 0;
  for (const line of lines) {
    const fs_ = line.split(/\s+/).filter(x => x !== '');
    fields_loop: for (let j = 0; j < fs_.length; j++) {
      const v = fs_[j];
      if (v.length < 4) continue;
      fields++;
      const prev = hist[hist.length - 1];
      if (prev && prev[j] === v) { adj++; continue; }
      for (let k = hist.length - 2; k >= Math.max(0, hist.length - W); k--) {
        if (hist[k][j] === v) { far++; farTok += countTokens(v, 'o200k_base'); continue fields_loop; }
      }
    }
    hist.push(fs_);
  }
  tot.fields += fields; tot.adjacentEq += adj; tot.farEq += far; tot.farTok += farTok;
  console.log(`${f.replace('bench/', '')}: fields(len>=4)=${fields} adjacentEqual=${adj} farEqual(W=${W})=${far} farTokensAtStake=${farTok}`);
}
console.log('TOTAL', JSON.stringify(tot));
