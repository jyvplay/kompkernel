// Z37: VERITAS-M (shipped entry point veritasMEncode) over all 151 files of bench/z34/receipts/vxr-eval-151.jsonl.
// Each file: encode, decode through the shipped decoder (veritasRDecode), require byte equality with the input.
// DAEDALUS comparison is joined by repository-relative path (bench/z37/join151.py), not by basename.
import fs from 'node:fs';
import { veritasMEncode } from '@/lib/omega/veritas-m';
import { veritasRDecode } from '@/lib/omega/veritas-r';
const OUT = process.env.OUT ?? '/home/user/z37/vxm-151.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
fs.writeFileSync(OUT, '');
for (const r of rows) {
  const text = fs.readFileSync(r.file, 'utf8');
  const t0 = Date.now();
  const enc = veritasMEncode(text);
  const dec = veritasRDecode(enc.wire);
  const rec = { group: r.group, file: r.file, chars: text.length, bytes: Buffer.byteLength(text, 'utf8'), inTokens: enc.inTokens, vxm: enc.outTokens, mode: enc.mode, exact: enc.exact && dec === text, ent: enc.entries, ms: Date.now() - t0 };
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
}
console.log('done', OUT);
