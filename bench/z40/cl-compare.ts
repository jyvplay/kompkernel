// Z40: A10 and VERITAS-Q under cl100k_base over the same 151-file corpus (same file list as dual-151.ts). Sharded by SHARD=i/n.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA10Encode } from '@/lib/omega/phalanx-a10';
import { veritasQEncode } from '@/lib/omega/veritas-q';
const [si, sn] = (process.env.SHARD ?? '0/1').split('/').map(Number);
const OUT = process.env.OUT ?? '/home/user/z40/cl-compare.jsonl';
const ONLY = (process.env.GROUPS ?? '').split(',').filter(Boolean);
const done = new Set<number>(fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).idx) : []);
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
rows.forEach((r, i) => {
  if (i % sn !== si) return;
  if (ONLY.length && !ONLY.includes(r.group)) return;
  if (done.has(i)) return;
  const text = fs.readFileSync(r.file, 'utf8');
  const enc = 'cl100k_base' as const;
  const inC = countTokens(text, enc);
  let a10 = inC, vq = inC, a10ok = true, vqok = true;
  try { const a = phalanxA10Encode(text, enc); a10 = a.outTokens; a10ok = a.decoded === text; } catch { a10ok = false; }
  try { const q = veritasQEncode(text, enc); vq = q.outTokens; vqok = q.decoded === text; } catch { vqok = false; }
  fs.appendFileSync(OUT, JSON.stringify({ idx: i, group: r.group, file: r.file, inC, a10C: a10, a10ok, vqC: vq, vqok }) + '\n');
});
console.log('done', si, sn);
