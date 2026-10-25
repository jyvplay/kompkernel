/** X43 potential: shaped-numeric DELTA coding on real lanes. Measure before building. */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
function b36(n: bigint): string {
  if (n === 0n) return '0';
  let s = ''; const neg = n < 0n; if (neg) n = -n;
  while (n > 0n) { s = B36[Number(n % 36n)] + s; n /= 36n; }
  return (neg ? '-' : '') + s;
}
/** mask of a string: digit runs -> '#', everything else literal. */
function maskOf(s: string): { mask: string; runs: string[] } {
  const runs: string[] = [];
  const mask = s.replace(/\d+/g, (d) => { runs.push(d); return '\u0001'; });
  return { mask, runs };
}
const lanes = (process.env.LANES || '').split(',').filter(Boolean);
for (const p of lanes) {
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  // column 0 = everything up to the first run of 2+ spaces, if it looks numeric
  const col: string[] = [];
  for (const l of lines) { const m = /^(\S+)/.exec(l); if (m && /\d/.test(m[1])) col.push(m[1]); }
  if (col.length < 5) { console.log(p.split('/').pop(), 'no shaped column'); continue; }
  const masks = new Set(col.map((v) => maskOf(v).mask));
  const sameShape = masks.size === 1;
  // delta in BigInt over the concatenated digit run
  const nums = col.map((v) => {
    const m = maskOf(v); return BigInt(m.runs.join('') || '0');
  });
  const deltas: string[] = [];
  for (let i = 0; i < nums.length; i++) deltas.push(b36(i === 0 ? nums[0] : nums[i] - nums[i - 1]));
  const rawTok = T(col.join('\n'));
  const deltaTok = T(deltas.join('\n'));
  const shapeTok = T([...masks][0]);
  console.log(p.split('/').pop()!.padEnd(22), 'n=' + String(col.length).padStart(3),
    'shapes=' + masks.size, 'sample=' + JSON.stringify(col[0]).slice(0, 30),
    'rawCol=' + String(rawTok).padStart(4), 'deltaCol=' + String(deltaTok).padStart(4),
    'shapeSpec=' + shapeTok, 'saving=' + (rawTok - deltaTok - shapeTok));
}
