// z51 harness: frontier (DAEDALUS, PARADEIGMA) on every prose/ops/holdout lane, split into contract vs wire.
// usage: OMEGA_DET=1 bench/tmp/run.sh bench/z51/lanes.ts <file> ...
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const d = daedalusEncode(text, enc, {});
  const row = {
    file: f, raw: d.inTokens, M: d.messageTokens, wire: d.outTokens, contract: d.contractTokens,
    exact: d.exact && d.decoded === text, arm: d.winningArm, ms: Date.now() - t0,
  };
  console.log(JSON.stringify(row));
}
