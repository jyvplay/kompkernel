// Z34: search-option variants on a file list. Exact round trip checked on every output.
import fs from 'node:fs';
import { veritasSEncode } from '@/lib/omega/veritas-s';
const variants: { name: string; o: { kImprove?: number; maxTrials?: number; refine?: boolean } }[] = [
  { name: 'base-norefine', o: { refine: false } },
  { name: 'refine', o: { refine: true } },
  { name: 'refine-wide', o: { refine: true, kImprove: 20, maxTrials: 2000 } },
];
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  for (const v of variants) {
    const t0 = Date.now();
    const r = veritasSEncode(t, 'o200k_base', v.o);
    console.log(JSON.stringify({ file: f.split('/').pop(), variant: v.name, in: r.inTokens, out: r.outTokens, entries: r.entries, exact: r.exact, ms: Date.now() - t0 }));
  }
}
