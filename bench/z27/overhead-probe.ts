// Where do VXA-best wire tokens go? header (legend + entries + ']]') vs body, per file. Real files only.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasABest } from '@/lib/omega/veritas-a';
let H = 0, B = 0, N = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = veritasABest(t, 'o200k_base');
  if (r.mode !== 'dict') { console.log(`${f}: identity`); continue; }
  const cut = r.wire.indexOf('\n]]\n') + 4;
  const hdr = countTokens(r.wire.slice(0, cut), 'o200k_base');
  const body = countTokens(r.wire.slice(cut), 'o200k_base');
  H += hdr; B += body; N += r.entries.length;
  console.log(`${f}: entries=${r.entries.length} header=${hdr} body=${body} header-share=${(100 * hdr / (hdr + body)).toFixed(1)}%`);
}
console.log(`ALL entries=${N} header=${H} body=${B} header-share=${(100 * H / (H + B)).toFixed(1)}%`);
