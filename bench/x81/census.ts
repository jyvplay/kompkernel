/** X81 — census of "letter SPACE digit" sites vs original letter-digit adjacencies.
 *  net ≈ sites (each saves ~1 tok) − adj (each needs a marker, ~1 tok) − contract (~12). */
import * as fs from 'node:fs';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const sites = (S.match(/\p{L} (?=\p{N})/gu) ?? []).length;
  const adj = (S.match(/\p{L}\p{N}/gu) ?? []).length;
  // also: what precedes the space-before-digit sites?
  const pre = new Map<string, number>();
  for (const m of S.matchAll(/\p{L} (?=\p{N})/gu)) { const c = m[0][0] === undefined ? '?' : 'letter'; pre.set(c, (pre.get(c) ?? 0) + 1); }
  const anySpaceBeforeDigit = (S.match(/\S (?=\p{N})/gu) ?? []).length;
  const net = sites - adj - 12;
  rows.push({ lane: p.split('/').pop(), sites, adj, anySpaceBeforeDigit, net });
  console.log(`${p.split('/').pop()!.padEnd(24)} sites ${String(sites).padStart(4)}  adj ${String(adj).padStart(4)}  anyNonSpaceSpc→digit ${String(anySpaceBeforeDigit).padStart(4)}  net ${net >= 0 ? '+' : ''}${net}`);
}
fs.writeFileSync('bench/x81/receipts/census.json', JSON.stringify(rows, null, 1) + '\n');
const good = rows.filter((r) => r.net > 0).sort((a, b) => b.net - a.net);
console.log(`\nlanes with positive naive net: ${good.length}/${rows.length}`);
good.slice(0, 10).forEach((r) => console.log(`   ${r.lane.padEnd(24)} sites ${r.sites} adj ${r.adj} net ${r.net}`));
