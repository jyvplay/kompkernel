/** The channel-capacity audit: how many bits each wire token is actually carrying. */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, enc);
  const br = zlib.brotliCompressSync(Buffer.from(t, 'utf8'), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
  // digit channel: 3 digits per o200k token measured below, not assumed
  rows.push({ lane: p.split('/').pop(), chars: t.length, raw, brotli: br });
}
// measure the digit channel directly instead of asserting it
const digitProbe = (n: number) => {
  let s = '';
  let seed = 12345;
  for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; s += String(seed % 10); }
  return s;
};
for (const n of [300, 3000, 30000]) {
  const s = digitProbe(n);
  console.log(`digits ${String(n).padStart(6)}  tokens ${String(countTokens(s, enc)).padStart(6)}  chars/token ${(n / countTokens(s, enc)).toFixed(3)}  bits/token ${(Math.log2(10) * n / countTokens(s, enc)).toFixed(2)}`);
}
// letters: an atom-shaped word list channel (space + letters) measured, not assumed
const words: string[] = [];
for (let i = 0; i < 2000; i++) {
  let w = '';
  let x = i * 2654435761 % 4294967296;
  for (let k = 0; k < 6; k++) { w += String.fromCharCode(97 + (x % 26)); x = Math.floor(x / 26); }
  words.push(' ' + w);
}
const joined = words.join('');
console.log(`atom words 2000  tokens ${countTokens(joined, enc)}  bits/token cap ${Math.log2(2000).toFixed(2)}`);
console.log(JSON.stringify(rows));
