import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { apographeDecodeResult, apographeEncode } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';

const LANES: Array<[string, string]> = [
  ['page.html', 'bench/holdout-mk/page.html'],
  ['chart.svg', 'bench/holdout-mk/chart.svg'],
  ['pom.xml', 'bench/holdout-mk/pom.xml'],
  ['component.jsx', 'bench/holdout-mk/component.jsx'],
  ['dump.sql', 'bench/holdout-mk/dump.sql'],
  ['paper.tex', 'bench/holdout-mk/paper.tex'],
  ['agent-history.md', 'bench/holdout-mk/agent-history.md'],
];
const enc: any = 'o200k_base';
const rows: any[] = [];
let failures = 0;
for (const [lane, path] of LANES) {
  const text = fs.readFileSync(path, 'utf8');
  const r = apographeEncode(text, enc);
  const row = {
    lane, path, sourceSha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length, rawTokens: countTokens(text, enc), messageTokens: r.messageTokens,
    exact: apographeDecodeResult(r) === text, applied: r.apographe, lifts: r.apographeLifts.length,
    notes: r.notes,
  };
  rows.push(row);
  if (!row.exact) failures++;
  console.log(`${row.exact ? 'PASS' : 'FAIL'} ${lane.padEnd(18)} APO=${row.messageTokens} applied=${row.applied} lifts=${row.lifts}`);
}
const summary = { encoding: enc, lanes: rows.length, exact: rows.filter(r => r.exact).length,
  failures, scope: 'registered APOGRAPHE X39 full-message baseline, same holdouts' };
fs.mkdirSync('bench/x47/receipts', { recursive: true });
fs.writeFileSync('bench/x47/receipts/apographe-frontier.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failures) process.exitCode = 1;
