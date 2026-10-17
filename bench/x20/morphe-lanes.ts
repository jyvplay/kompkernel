import fs from 'node:fs';
import { morpheEncode, morpheDecode } from '@/lib/omega/morphe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  let r: any;
  try { r = morpheEncode(t, 'o200k_base'); }
  catch (e: any) { console.log(JSON.stringify({ file: f.split('/').pop(), ERR: String(e?.message ?? e).slice(0, 160) })); continue; }
  const dec = morpheDecode(r.wire, { rules: r.rules, sep: r.sep, after: r.after, tag: r.armTag });
  console.log(JSON.stringify({
    file: f.split('/').pop(), rawTok: r.inTokens, ident: r.identityTokens, M: r.messageTokens,
    arm: r.arm, exact: r.exact && dec === t, rules: r.rules.join('+') || '-', rejected: r.rejected.join('+') || '-',
    clauseTok: r.clauseTokens, hits: r.hits, dates: r.dates, times: r.times, afters: r.afters, dropped: r.dropped,
    wire: r.armTag, delta: r.messageTokens - r.identityTokens, ms: Date.now() - t0,
  }));
}
