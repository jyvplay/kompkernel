// z52: DENDRON-S vs the frontier candidates on real lanes. One-chat M (contract + wire), o200k, OMEGA_DET=1.
// usage: OMEGA_DET=1 bench/tmp/run.sh bench/z52/bench-dens.ts <file>...
import fs from 'node:fs';
import { densEncode, densDecode } from '@/lib/omega/dendrons';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = densEncode(text, enc, {});
  const exact = densDecode(r.wire) === text && r.decoded === text;
  console.log(JSON.stringify({ file: f, frontierM: r.frontierM, densM: r.messageTokens, delta: r.messageTokens - r.frontierM, pct: +(100 * (r.messageTokens - r.frontierM) / r.frontierM).toFixed(2), applied: r.applied, sep: r.sep, treeM: r.treeM, treeLines: r.treeLines, exact, ms: Date.now() - t0, notes: r.notes }));
}
