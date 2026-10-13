// Z39 probe: VERITAS-P on the files named on the command line. Exactness through the shipped decoder, counts, time.
import fs from 'node:fs';
import { veritasPEncode } from '@/lib/omega/veritas-p';
import { veritasRDecode } from '@/lib/omega/veritas-r';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const p = veritasPEncode(t);
  const dec = veritasRDecode(p.wire);
  console.log(JSON.stringify({ f: f.split('/').pop(), chars: t.length, inTokens: p.inTokens, vxp: p.outTokens, entries: p.entries, legend: p.legend, raw: p.raw, exact: dec === t, trials: p.trials, steps: p.steps, forced: p.forced, refine: p.refine, ms: Date.now() - t0 }));
  fs.writeFileSync('/home/user/z39/vxp-' + f.split('/').pop() + '.wire.txt', p.wire);
}
