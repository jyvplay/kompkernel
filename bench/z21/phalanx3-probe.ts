// PHALANX-P3 (P2 + RECALL-R1) vs PHALANX-P2 on all holdout files + 3 captured ops samples. o200k_base.
// EXACT column = full-chain decode equals input. Gates: K and R each kept only if they lower VERITAS output.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx2Encode, phalanx2Decode } from '@/lib/omega/phalanx2';
import { phalanx3Encode, phalanx3Decode } from '@/lib/omega/phalanx3';
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
  ...fs.readdirSync('bench/z20/samples').map(f => `bench/z20/samples/${f}`),
];
let s2 = 0, s3 = 0, sid = 0, worse = 0, fail = 0;
console.log('file | identity | P2 | P3 | P3-P2 | P3 mode | K | R | exact');
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const id = countTokens(t, 'o200k_base');
  const a = phalanx2Encode(t, 'o200k_base');
  const b = phalanx3Encode(t, 'o200k_base');
  const ea = phalanx2Decode(a.wire) === t, eb = phalanx3Decode(b.wire) === t;
  if (!ea || !eb) fail++;
  if (b.outTokens > a.outTokens) worse++;
  sid += id; s2 += a.outTokens; s3 += b.outTokens;
  const d = b.outTokens - a.outTokens;
  console.log([f.replace(/^bench\//, ''), id, a.outTokens, b.outTokens, (d >= 0 ? '+' : '') + d, b.mode, b.koineKept ? 'on' : 'off', b.recallKept ? 'on' : 'off', `${ea},${eb}`].join(' | '));
}
console.log(`TOTAL identity=${sid} P2=${s2} P3=${s3} (P3-P2=${s3 - s2}) files_P3_larger=${worse} exact_failures=${fail}`);
