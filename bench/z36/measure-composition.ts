// Z36: token composition of raw text under o200k: whitespace-only tokens, newline-bearing tokens, digit tokens.
import fs from 'node:fs';
import { tokenStrings } from '@/lib/omega/bpe';
const files = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const ts = tokenStrings(text, 'o200k_base');
  let ws = 0, nl = 0, dig = 0, punct = 0, alpha = 0, n = ts.length;
  for (const { s } of ts) {
    if (/^\s+$/.test(s)) ws++;
    if (s.includes('\n')) nl++;
    if (/^[0-9]+$/.test(s.trim()) && s.trim().length) dig++;
    if (/^[^\w\s]+$/.test(s.trim()) && s.trim().length) punct++;
    if (/[A-Za-z]/.test(s)) alpha++;
  }
  console.log(JSON.stringify({ f: f.split('/').slice(-2).join('/'), n, ws: +(ws / n).toFixed(3), nl: +(nl / n).toFixed(3), dig: +(dig / n).toFixed(3), punct: +(punct / n).toFixed(3), alpha: +(alpha / n).toFixed(3) }));
}
