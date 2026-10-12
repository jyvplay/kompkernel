// Z36: VXR search-budget sensitivity. Calls the shipped encoder with explicit options (no environment knobs).
// Configs used for the receipts: default, {kImprove:30}, {maxTrials:3000}, {kImprove:100,maxTrials:3000,refineBudget:40000}.
import fs from 'node:fs';
import { veritasREncodeWith, DEFAULT_VXR_OPTS, type VxrSearchOptions } from '@/lib/omega/veritas-r';
const cfg: Partial<VxrSearchOptions> = JSON.parse(process.env.CFG ?? '{}');
const opts = { ...DEFAULT_VXR_OPTS, ...cfg };
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = veritasREncodeWith(text, 'o200k_base', opts);
  console.log(JSON.stringify({ f: f.split('/').pop(), cfg, out: r.outTokens, ent: r.entries, exact: r.exact, trials: r.trials, ms: Date.now() - t0 }));
}
