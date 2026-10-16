import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stigmeEncode, stigmeDecode } from '@/lib/omega/stigme';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  let r: any;
  try { r = stigmeEncode(t, 'o200k_base'); }
  catch (e: any) { console.log(JSON.stringify({ file: f.split('/').pop(), ERR: String(e?.message ?? e).slice(0, 120) })); continue; }
  const decoded = stigmeDecode(r.wire, r.clauses, r.sep);
  console.log(JSON.stringify({
    file: f.split('/').pop(), rawTok: r.inTokens, ident: r.identityTokens, M: r.messageTokens,
    arm: r.arm, exact: r.exact && decoded === t, clauses: r.clauses.join('+') || '-', clauseTok: r.clauseTokens,
    dates: r.dates, times: r.times, afters: r.afters, dropped: r.dropped, wire: r.armTag,
    delta: r.messageTokens - r.identityTokens, ms: Date.now() - t0,
  }));
}
