import fs from 'node:fs';
import { stigmeEncode, stigmeDecode } from '@/lib/omega/stigme';
const out = process.env.OUT || 'bench/x19/receipts/stigme-lanes-v3.jsonl';
const w = fs.createWriteStream(out, { flags: 'a' });
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  let r: any;
  try { r = stigmeEncode(t, 'o200k_base'); }
  catch (e: any) { w.write(JSON.stringify({ file: f.split('/').pop(), ERR: String(e?.message ?? e).slice(0, 160) }) + '\n'); console.log('ERR', f); continue; }
  const decoded = stigmeDecode(r.wire, r.clauses, r.sep, r.armTag);
  const row = {
    file: f.split('/').pop(), rawTok: r.inTokens, ident: r.identityTokens, M: r.messageTokens,
    arm: r.arm, exact: r.exact && decoded === t, clauses: r.clauses.join('+') || '-', clauseTok: r.clauseTokens,
    dates: r.dates, times: r.times, afters: r.afters, dropped: r.dropped, wire: r.armTag,
    delta: r.messageTokens - r.identityTokens, ms: Date.now() - t0,
  };
  w.write(JSON.stringify(row) + '\n');
  console.log(`${row.file}: ident ${row.ident} -> M ${row.M} (${row.arm}/${row.wire}/${row.clauses}) exact=${row.exact}`);
}
w.end();
