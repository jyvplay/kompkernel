// TABMIN vs LAKONIKOS(row) on tabular files. usage: tabmin-bench.mjs <part>/<parts> <files...>
// Writes one JSON line per file: row (LAKONIKOS) message tokens, TABMIN message tokens, arm, exact flags.
import fs from 'node:fs';
import { tabminEncode } from '../src/lib/omega/tabmin';
const [ps, ...files] = process.argv.slice(2);
const [part, parts] = ps.split('/').map(Number);
files.forEach((f, i) => {
  if (i % parts !== part) return;
  const T = fs.readFileSync(f, 'utf8');
  const r = tabminEncode(T, 'o200k_base');
  console.log(JSON.stringify({ file: f, inTokens: r.inTokens, rowMsg: r.rowMessageTokens, tabminMsg: r.messageTokens,
    arm: r.arm, colMsg: r.columnMessageTokens, exact: r.exact && r.decoded === T, ms: 0 }));
});
