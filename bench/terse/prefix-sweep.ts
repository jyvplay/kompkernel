// Dev/test sweep of the minKeep threshold for line-prefix elision over CHIRON (8M-unit search).
// Split: sorted holdout list, even index = DEV, odd index = TEST. Threshold chosen on DEV only.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironEncode } from '../../src/lib/omega/chiron';
import { elideEncode, elideDecode } from './prefix-elide';
const dirs = ['bench/holdout', 'bench/holdout-ops', 'bench/holdout-tbl', 'bench/holdout-tab', 'bench/holdout-mk', 'bench/holdout-work', 'bench/holdout-lang'];
const files: string[] = [];
for (const d of dirs) for (const f of fs.readdirSync(d).sort()) files.push(path.join(d, f));
const ks = [0, 6, 10, 14, 20, 30];
const split = process.argv[2]; // 'dev' | 'test' | 'all'
const sel = files.filter((_, i) => split === 'all' || (split === 'dev') === (i % 2 === 0));
for (const f of sel) {
  const t = fs.readFileSync(f, 'utf8');
  const base = chironEncode(t, 'o200k_base', { workUnits: 8_000_000 });
  const row: any = { file: f, raw: countTokens(t, 'o200k_base'), base: base.messageTokens, baseExact: base.decoded === t };
  for (const k of ks) {
    if (k === 0) continue;
    const e = elideEncode(t, k);
    if (e === t) { row['k' + k] = base.messageTokens; row['rt' + k] = true; continue; }
    const r = chironEncode(e, 'o200k_base', { workUnits: 8_000_000 });
    const clause = countTokens(' Lines starting ⇡N copy the first N separator-delimited spans of the line above.', 'o200k_base');
    row['k' + k] = r.messageTokens + clause;
    row['rt' + k] = elideDecode(e) === t && r.decoded === e;
  }
  console.log(JSON.stringify(row));
}
