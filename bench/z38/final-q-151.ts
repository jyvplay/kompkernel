// Z38: VERITAS-Q (shipped entry point veritasQEncode) over the 151-file corpus, sharded by SHARD=i/n.
// Each file: encode, decode through the shipped decoder (veritasRDecode), require byte equality with the input.
import fs from 'node:fs';
import { veritasQEncode } from '@/lib/omega/veritas-q';
import { veritasRDecode } from '@/lib/omega/veritas-r';
const [si, sn] = (process.env.SHARD ?? '0/1').split('/').map(Number);
const OUT = process.env.OUT ?? '/home/user/z38/vxq-151.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
rows.forEach((r, i) => {
  if (i % sn !== si) return;
  const text = fs.readFileSync(r.file, 'utf8');
  const t0 = Date.now();
  const q = veritasQEncode(text);
  const dec = veritasRDecode(q.wire);
  fs.appendFileSync(OUT, JSON.stringify({ idx: i, group: r.group, file: r.file, chars: text.length, inTokens: q.inTokens, vxq: q.outTokens, legend: q.legend, entries: q.entries, exact: q.exact && dec === text, ms: Date.now() - t0 }) + '\n');
});
console.log('done shard', si, sn);
