/** Zero-encoder verification: X117 A/B OFF arm must equal the X116 A/B ON arm
 * message/token-id hashes lane by lane (ΣΥΝΘΕΣΙΣ disabled = X116 shipped). */
import * as fs from 'node:fs';
const x116 = JSON.parse(fs.readFileSync(process.argv[2] ?? 'bench/x116/receipts/ab.json', 'utf8'));
const x117 = JSON.parse(fs.readFileSync(process.argv[3] ?? 'bench/x117/receipts/ab.json', 'utf8'));
const byPath = new Map<string, any>();
for (const r of x116.rows as any[]) byPath.set(r.path, r);
const rows: any[] = [];
let identical = 0;
for (const r of x117.rows as any[]) {
  const prev = byPath.get(r.path);
  const ok = !!prev && prev.on.messageSHA256 === r.off.messageSHA256
    && prev.on.tokenIdsSHA256 === r.off.tokenIdsSHA256 && prev.on.tokens === r.off.tokens;
  if (ok) identical++;
  rows.push({ path: r.path, identical: ok, tokens: r.off.tokens });
}
const receipt = { schema: 'kompkernel-x117-off-verification-v1', date: '2026-11-15',
  lanes: rows.length, identical, allIdentical: identical === rows.length && rows.length === 29, rows };
fs.writeFileSync('bench/x117/receipts/off-verification.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`OFF=X116-ON identical ${identical}/${rows.length} allIdentical=${receipt.allIdentical}`);
if (!receipt.allIdentical) process.exitCode = 1;
