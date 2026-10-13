// PHALANX-P2 probe vs PHALANX-P1 vs identity vs VERITAS-VX, all 17 holdout files + package-lock-head.
// o200k_base. Every wire is decoded and compared byte-for-byte (EXACT column).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxEncode, phalanxDecode } from '@/lib/omega/phalanx';
import { phalanx2Encode, phalanx2Decode } from '@/lib/omega/phalanx2';
import { veritasEncode } from '@/lib/omega/veritas';
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
];
let sumId = 0, sumP1 = 0, sumP2 = 0, anyFail = false, worse = 0;
console.log('file | identity | VERITAS-VX | PHALANX-P1 | PHALANX-P2 | P2-vs-P1 | P2 mode | KOINE | exact(P1,P2)');
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const id = countTokens(t, 'o200k_base');
  const v = countTokens(veritasEncode(t, 'o200k_base').wire, 'o200k_base');
  const p1 = phalanxEncode(t, 'o200k_base');
  const p2 = phalanx2Encode(t, 'o200k_base');
  const e1 = phalanxDecode(p1.wire) === t, e2 = phalanx2Decode(p2.wire) === t;
  if (!e1 || !e2) anyFail = true;
  if (p2.outTokens > p1.outTokens) worse++;
  sumId += id; sumP1 += p1.outTokens; sumP2 += p2.outTokens;
  const d = p2.outTokens - p1.outTokens;
  console.log([f.replace('bench/', ''), id, v, p1.outTokens, p2.outTokens, (d >= 0 ? '+' : '') + d, p2.mode, p2.koineKept ? 'kept' : 'off', `${e1},${e2}`].join(' | '));
}
console.log(`TOTAL identity=${sumId} P1=${sumP1} P2=${sumP2} (P2-P1=${sumP2 - sumP1}) files_where_P2_larger_than_P1=${worse} any_exact_fail=${anyFail}`);
