/** X43 residual census: in the FINAL wire, what are the surviving tokens made of? */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { tokenStrings, countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
type Cls = 'space' | 'punct' | 'digit' | 'word' | 'mark' | 'mixed';
function cls(s: string): Cls {
  if (/^[\s]+$/.test(s)) return 'space';
  if (/^[^\p{L}\p{N}]+$/u.test(s)) return 'punct';
  if (/^[\p{N}]+$/u.test(s)) return 'digit';
  if (/^ ?[\p{L}]+$/u.test(s)) return 'word';
  if (/^[^\p{L}\p{N}\s]+$/u.test(s)) return 'punct';
  return 'mixed';
}
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = ouraEncode(t, ENC);
  const w = r.wire + '\n' + (r.contract ?? '');
  const toks = tokenStrings(w, ENC);
  const acc: Record<string, { n: number; chars: number }> = {};
  for (const { s } of toks) {
    const c = cls(s);
    acc[c] = acc[c] ?? { n: 0, chars: 0 };
    acc[c].n++; acc[c].chars += s.length;
  }
  const tot = toks.length;
  const parts = Object.entries(acc).sort((a, b) => b[1].n - a[1].n)
    .map(([k, v]) => `${k} ${v.n} (${(100 * v.n / tot).toFixed(0)}%)`).join('  ');
  // how much of the word mass is a REPEAT of a word already seen in the wire?
  const seen = new Set<string>(); let rep = 0, repChars = 0;
  for (const { s } of toks) {
    if (cls(s) !== 'word') continue;
    const key = s.trim().toLowerCase();
    if (seen.has(key)) { rep++; repChars += s.length; } else seen.add(key);
  }
  console.log(p.split('/').pop()!.padEnd(22), 'wireTok=' + String(tot).padStart(5),
    'raw=' + String(countTokens(t, ENC)).padStart(5), '|', parts,
    '| wordRepeats', rep, '(' + (100 * rep / Math.max(1, tot)).toFixed(0) + '%)');
}
