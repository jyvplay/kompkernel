// Encoder wall-clock (median of 5 runs, ms) for P1, P2, P3 on the largest ops files. Same machine, same process.
import fs from 'node:fs';
import { phalanxEncode } from '@/lib/omega/phalanx';
import { phalanx2Encode } from '@/lib/omega/phalanx2';
import { phalanx3Encode } from '@/lib/omega/phalanx3';
const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const f of ['bench/holdout-ops/openstack-loghub-26.log', 'bench/holdout-ops/package-lock-head.json', 'bench/holdout-ops/find-listing.txt']) {
  const t = fs.readFileSync(f, 'utf8');
  const row: string[] = [];
  for (const [name, fn] of [['P1', phalanxEncode], ['P2', phalanx2Encode], ['P3', phalanx3Encode]] as const) {
    fn(t, 'o200k_base');
    const ts: number[] = [];
    for (let i = 0; i < 5; i++) { const t0 = performance.now(); fn(t, 'o200k_base'); ts.push(performance.now() - t0); }
    row.push(`${name} ${median(ts).toFixed(0)}ms`);
  }
  console.log(f.replace('bench/holdout-ops/', ''), '|', row.join(' | '));
}
