/** Zero-encoder verification: X115 A/B OFF arm must equal the X114 baseline
 * message/token-id hashes lane by lane (chain+ΕΝΑΛΛΑΓΗ disabled = X114). */
import * as fs from 'node:fs';
const base = JSON.parse(fs.readFileSync('bench/x114/receipts/baseline.json', 'utf8'));
const ab = JSON.parse(fs.readFileSync(process.argv[2] ?? 'bench/x115/receipts/ab.json', 'utf8'));
const byPath = new Map<string, any>();
for (const r of base.rows as any[]) byPath.set(r.path, r);
const rows: any[] = [];
let identical = 0;
for (const r of ab.rows as any[]) {
  const prev = byPath.get(r.path);
  const ok = !!prev && prev.messageSHA256 === r.off.messageSHA256
    && prev.tokenIdsSHA256 === r.off.tokenIdsSHA256 && prev.tokens === r.off.tokens;
  if (ok) identical++;
  rows.push({ path: r.path, identical: ok, tokens: r.off.tokens });
}
const receipt = { schema: 'kompkernel-x115-ab-off-verification-v1', date: '2026-11-14',
  lanes: rows.length, identical, allIdentical: identical === rows.length && rows.length === 29, rows };
fs.writeFileSync('bench/x115/receipts/ab-off-verification.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`OFF=X114 identical ${identical}/${rows.length} allIdentical=${receipt.allIdentical}`);
if (!receipt.allIdentical) process.exitCode = 1;
