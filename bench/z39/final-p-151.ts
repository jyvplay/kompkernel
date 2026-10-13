// Z39: VERITAS-P over the 151-file corpus (same file list as Z38: bench/z34/receipts/vxr-eval-151.jsonl), sharded by SHARD=i/n.
// Each file: encode, decode through the shipped decoder (veritasRDecode), require byte equality with the input.
// Appends one JSON row per file to OUT. Counts are o200k messages (VERITAS-P wire + legend instruction counted).
import fs from 'node:fs';
import { veritasPEncode } from '@/lib/omega/veritas-p';
import { veritasRDecode } from '@/lib/omega/veritas-r';
const [si, sn] = (process.env.SHARD ?? '0/1').split('/').map(Number);
const OUT = process.env.OUT ?? '/home/user/z39/vxp-151.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
rows.forEach((r, i) => {
  if (i % sn !== si) return;
  if (only && !only.has(r.group)) return;
  const text = fs.readFileSync(r.file, 'utf8');
  const t0 = Date.now();
  const p = veritasPEncode(text);
  const dec = veritasRDecode(p.wire);
  fs.appendFileSync(OUT, JSON.stringify({ idx: i, group: r.group, file: r.file, chars: text.length, inTokens: p.inTokens, vxp: p.outTokens, legend: p.legend, entries: p.entries, raw: p.raw, exact: p.exact && dec === text, trials: p.trials, steps: p.steps, forced: p.forced, refine: p.refine, ms: Date.now() - t0 }) + '\n');
});
console.log('done shard', si, sn);
