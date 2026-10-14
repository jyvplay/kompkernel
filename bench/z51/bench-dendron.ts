// z51 harness: DENDRON vs frontier (plain DAEDALUS) on each file. M = tokens(contract + wire), one chat message.
// usage: OMEGA_DET=1 bench/tmp/run.sh bench/z51/bench-dendron.ts file ...
import fs from 'node:fs';
import { denEncode, denDecode } from '@/lib/omega/dendron';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = denEncode(text, enc, {});
  const exact = denDecode(r.wire) === text && r.decoded === text;
  console.log(JSON.stringify({
    file: f, raw: r.inTokens, frontier: r.frontierM, dendron: r.messageTokens,
    delta: r.messageTokens - r.frontierM, pct: +(100 * (r.messageTokens - r.frontierM) / r.frontierM).toFixed(2),
    applied: r.applied, treeLines: r.treeLines, exact, ms: Date.now() - t0,
  }));
}
