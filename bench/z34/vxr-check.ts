// Z34: VERITAS-R on files: one-chat wire tokens, entries, refinement moves, exact round trip, time.
import fs from 'node:fs';
import { veritasREncode } from '@/lib/omega/veritas-r';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = veritasREncode(t);
  console.log(JSON.stringify({ file: f.split('/').pop(), in: r.inTokens, out: r.outTokens, entries: r.entries, refine: r.refine, exact: r.exact, ms: Date.now() - t0 }));
}
