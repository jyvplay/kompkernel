import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { fotarPlan } from '../../src/lib/omega/fotar';

const paths = ['README.md', 'bench/z57/lanes/prose-changelog.md', 'bench/holdout-x40/metrics.tsv',
  'bench/holdout-ops/find-listing.txt', 'bench/holdout-ops/openstack-loghub-26.log'];
const rows = [] as any[];
for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  const text = fs.readFileSync(path, 'utf8');
  const plan = fotarPlan(text, 'o200k_base');
  rows.push({ path, sha256: crypto.createHash('sha256').update(text).digest('hex'), chars: text.length,
    rawTokens: countTokens(text, 'o200k_base'),
    candidate: plan ? { directCompleteTokens: plan.directMessageTokens, entries: plan.entries.length,
      aliasCount: plan.entries.reduce((n, e) => n + e.frequency, 0), mappedChars: plan.mapped.length,
      exact: plan.exact } : null });
}
fs.mkdirSync('bench/x65/receipts', { recursive: true });
fs.writeFileSync('bench/x65/receipts/fotar-screen.json', JSON.stringify(rows, null, 2) + '\n');
console.log(JSON.stringify(rows, null, 2));
