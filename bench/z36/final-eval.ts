// Z36: VERITAS-K (shipped entry point veritasKEncode) over every corpus file present on disk.
// Each file: encode, decode through the shipped decoder (veritasRDecode), require byte equality with the input.
import fs from 'node:fs';
import { veritasKEncode } from '@/lib/omega/veritas-k';
import { veritasRDecode } from '@/lib/omega/veritas-r';
const OUT = process.env.OUT ?? '/home/user/z36/vxk-final-40.jsonl';
const rows = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const D: Record<string, { messageTokens: number; inTokens: number }> = {};
for (const l of fs.readFileSync('bench/z33/receipts/daedalus-151.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); D[r.file.split('/').pop()] = r; }
fs.writeFileSync(OUT, '');
for (const r of rows) {
  if (!fs.existsSync(r.file)) continue;
  const name = r.file.split('/').pop();
  const text = fs.readFileSync(r.file, 'utf8');
  const t0 = Date.now();
  const enc = veritasKEncode(text);
  const dec = veritasRDecode(enc.wire);
  const rec = { group: r.group, file: name, chars: text.length, inTokens: enc.inTokens, vxr: r.search, vxk: enc.outTokens, mode: enc.mode, dae: D[name]?.messageTokens ?? null, exact: enc.exact && dec === text, ent: enc.entries, ms: Date.now() - t0 };
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
}
console.log('done', OUT);
