// Z32: PHALANX-A9 (VERITAS-N as VX stage) per file, decoded and checked. Baselines (A7, A8) are in the z31 outputs.
// usage: node a10-eval.cjs <list-file> <out.jsonl>   list lines: <group>\t<path>
import fs from 'node:fs';
import { phalanxA10Encode, phalanxA10Decode } from '@/lib/omega/phalanx-a10';
const [, , listFile, outFile] = process.argv;
const rows = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
fs.writeFileSync(outFile, '');
let fail = 0;
for (const [group, f] of rows) {
  const t = fs.readFileSync(f.startsWith('/') ? f : '/home/user/kompkernel/' + f, 'utf8');
  const t0 = Date.now();
  const r = phalanxA10Encode(t, 'o200k_base');
  const exact = phalanxA10Decode(r.wire) === t;
  if (!exact) fail++;
  fs.appendFileSync(outFile, JSON.stringify({ group, file: f, a10: r.outTokens, layer: r.layer, a10_exact: exact, a10_ms: Date.now() - t0 }) + '\n');
}
console.log('done', rows.length, 'exact failures', fail);
