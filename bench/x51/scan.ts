import fs from 'node:fs';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { chironEncode } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const lanes = [
  'bench/holdout-mk/page.html',
  'bench/holdout/gh-prose.txt',
  'bench/holdout-work/agent-history.md',
  'bench/holdout/json-pkg.json',
  'bench/holdout/code-ts.txt',
  'bench/holdout/lic-mit.txt',
  'bench/holdout-tab/aapl-2014.csv',
  'bench/holdout-tab/vix-daily-1990.csv',
  'bench/holdout-ops/kubectl.txt',
  'bench/holdout-x40/metrics.tsv',
  'bench/holdout-x40/cue-sheet.md',
  'bench/holdout/bibliography.txt',
  'bench/holdout-work/svenstaro_miniserve.md',
  'bench/holdout-work/spring-projects_spring-framework_35118.md',
];
for (const f of lanes) {
  if (!fs.existsSync(f)) { console.log(f, 'MISSING'); continue; }
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  const r: any = daedalusEncode(text, enc);
  console.log(f.padEnd(62), 'raw', String(raw).padStart(6), 'DAE', String(r.messageTokens).padStart(6), 'ms', Date.now() - t0);
}
