// Z38: quick VERITAS-Q check on the three files named on the command line (exactness + counts vs VERITAS-M).
import fs from 'node:fs';
import { veritasQEncode } from '@/lib/omega/veritas-q';
import { veritasMEncode } from '@/lib/omega/veritas-m';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const q = veritasQEncode(t);
  const m = veritasMEncode(t);
  console.log(JSON.stringify({ f: f.split('/').pop(), in: q.inTokens, vxm: m.outTokens, vxq: q.outTokens, legend: q.legend, exact: q.exact, ent: q.entries }));
}
