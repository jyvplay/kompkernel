import fs from 'node:fs';
import { morpheEncode, morpheDecode } from '@/lib/omega/morphe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = morpheEncode(t, 'o200k_base');
  const dec = morpheDecode(r.wire, { rules: r.rules, sep: r.sep, after: r.after, tag: r.armTag });
  console.log(`${f.split('/').pop()}: ident ${r.identityTokens} -> M ${r.messageTokens} (${r.messageTokens - r.identityTokens}) arm=${r.arm} wire=${r.armTag}`);
  console.log(`    rules=[${r.rules.join(',')}] clauseTok=${r.clauseTokens} rejected=[${r.rejected.join(',')}] hits=${JSON.stringify(r.hits)} exact=${r.exact && dec === t} ${Date.now() - t0}ms`);
}
