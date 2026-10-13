// LAKONIKOS vs DAEDALUS on the holdout lanes. One JSON line per file. Wall-clock DAEDALUS budget applies.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { lakonikosEncode } from '../../src/lib/omega/lakonikos';
const dirs = ['bench/holdout', 'bench/holdout-ops', 'bench/holdout-tbl', 'bench/holdout-tab', 'bench/holdout-mk', 'bench/holdout-work', 'bench/holdout-lang'];
const files: string[] = [];
for (const d of dirs) for (const f of fs.readdirSync(d).sort()) files.push(path.join(d, f));
const part = Number(process.argv[2]), parts = Number(process.argv[3]);
for (let i = 0; i < files.length; i++) {
  if (i % parts !== part) continue;
  const f = files[i];
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = lakonikosEncode(t, 'o200k_base');
  const raw = countTokens(t, 'o200k_base');
  console.log(JSON.stringify({ file: f, raw, mode: r.mode, daedalusMsg: r.messageTokensOld, lakonikosMsg: r.messageTokens,
    delta: r.messageTokens - r.messageTokensOld, exact: r.exact, decodedEqual: r.decoded === t,
    contractNew: r.contractTokens, contractOld: r.contractTokensOld, ms: Date.now() - t0 }));
}
