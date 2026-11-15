/** Zero-encoder verification: X116 A/B OFF arm must equal the X115 A/B ON arm
 * message/token-id hashes lane by lane (ΜΗΚΟΣ disabled = X115 shipped). */
import * as fs from 'node:fs';
const x115 = JSON.parse(fs.readFileSync(process.argv[2] ?? 'bench/x115/receipts/ab.json', 'utf8'));
const x116 = JSON.parse(fs.readFileSync(process.argv[3] ?? 'bench/x116/receipts/ab.json', 'utf8'));
const byPath = new Map<string, any>();
for (const r of x115.rows as any[]) byPath.set(r.path, r);
const rows: any[] = [];
let identical = 0;
for (const r of x116.rows as any[]) {
  const prev = byPath.get(r.path);
  const ok = !!prev && prev.on.messageSHA256 === r.off.messageSHA256
    && prev.on.tokenIdsSHA256 === r.off.tokenIdsSHA256 && prev.on.tokens === r.off.tokens;
  if (ok) identical++;
  rows.push({ path: r.path, identical: ok, tokens: r.off.tokens });
}
const receipt = { schema: 'kompkernel-x116-off-verification-v1', date: '2026-11-14',
  lanes: rows.length, identical, allIdentical: identical === rows.length && rows.length === 29, rows };
fs.writeFileSync('bench/x116/receipts/off-verification.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`OFF=X115-ON identical ${identical}/${rows.length} allIdentical=${receipt.allIdentical}`);
if (!receipt.allIdentical) process.exitCode = 1;
