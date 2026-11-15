/** Zero-encoder receipt comparison: current merged HEAD vs X116 final ON. */
import * as fs from 'node:fs';
const now = JSON.parse(fs.readFileSync(process.argv[2] ?? 'bench/x117/receipts/frontier.json', 'utf8'));
const prev = JSON.parse(fs.readFileSync('bench/x116/receipts/ab.json', 'utf8'));
const byPath = new Map<string, any>((prev.rows as any[]).map(r => [r.path, r.on]));
const rows = (now.rows as any[]).map(r => {
  const p = byPath.get(r.path);
  const identical = !!p && p.tokens === r.tokens && p.messageSHA256 === r.messageSHA256 && p.tokenIdsSHA256 === r.tokenIdsSHA256;
  return { path: r.path, tokens: r.tokens, expected: p?.tokens ?? null, identical, exact: r.exact };
});
const identical = rows.filter(r => r.identical).length;
const out = { schema: 'kompkernel-x117-frontier-verification-v1', date: '2026-11-15', reference: 'bench/x116/receipts/ab.json ON',
  sourceCommit: now.sourceCommit, lanes: rows.length, identical, total: now.total, expectedTotal: prev.totals.on,
  allIdentical: rows.length === 29 && identical === 29 && now.total === prev.totals.on && rows.every(r => r.exact), rows };
fs.writeFileSync('bench/x117/receipts/frontier-verification.json', JSON.stringify(out, null, 2) + '\n');
console.log(`X116 ON reproduced ${identical}/${rows.length}; total ${now.total} expected ${prev.totals.on}; exact ${rows.filter(r=>r.exact).length}/${rows.length}`);
if (!out.allIdentical) process.exitCode = 1;
