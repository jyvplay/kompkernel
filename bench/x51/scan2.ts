import fs from 'node:fs';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
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
  'bench/holdout-ops/ls-full-iso.txt',
];
let out = '';
for (const f of lanes) {
  if (!fs.existsSync(f)) { out += f + ' MISSING\n'; continue; }
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  const r: any = daedalusEncode(text, enc);
  out += f.padEnd(46) + ' raw ' + String(raw).padStart(6) + ' DAE ' + String(r.messageTokens).padStart(6) + ' ms ' + (Date.now() - t0) + '\n';
  fs.writeFileSync('/tmp/scan2.txt', out);
}
