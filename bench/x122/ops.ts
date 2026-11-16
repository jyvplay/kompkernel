import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironOpsUsed } from '../../src/lib/omega/chiron';
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
const rows: any[] = [];
for (const [p, m] of msgs) {
  const s0 = m.indexOf(CHIRON_START);
  if (s0 < 0) { rows.push([p, countTokens(m, 'o200k_base'), 'no-frame']); continue; }
  const u: any = chironOpsUsed(m.slice(s0));
  rows.push([p, countTokens(m, 'o200k_base'), JSON.stringify(u)]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const r of rows) console.log(String(r[1]).padStart(5), r[0].replace('bench/', ''), r[2]);
