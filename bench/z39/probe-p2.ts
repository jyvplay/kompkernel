// Z39: VERITAS-P with a progress trace on the file named on the command line (trace goes to stderr).
import fs from 'node:fs';
import { veritasPEncode, DEFAULT_VXP_OPTS } from '@/lib/omega/veritas-p';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const t0 = Date.now();
let last = t0;
const p = veritasPEncode(t, 'o200k_base', {
  ...DEFAULT_VXP_OPTS,
  anchorCap: Number(process.env.ANCHOR ?? DEFAULT_VXP_OPTS.anchorCap),
  model: (process.env.MODEL ?? 'line') as 'line' | 'symbol',
  maxTrials: Number(process.env.TRIALS ?? DEFAULT_VXP_OPTS.maxTrials),
  trace: (m) => {
    if (Date.now() - last > 10000 || /^step (1|10|20|40|60) /.test(m)) {
      console.error(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
      last = Date.now();
    }
  },
});
console.log(JSON.stringify({ f: f.split('/').pop(), inTokens: p.inTokens, vxp: p.outTokens, entries: p.entries, exact: p.exact, trials: p.trials, steps: p.steps, forced: p.forced, refine: p.refine, ms: Date.now() - t0 }));
