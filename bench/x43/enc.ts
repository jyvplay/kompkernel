/** X43: which encoding of a delta stream is cheapest in o200k? measure, don't guess. */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);
const b36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const b62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function rep(n: bigint, A: string): string {
  if (n === 0n) return A[0];
  const B = BigInt(A.length); let s = ''; const neg = n < 0n; if (neg) n = -n;
  while (n > 0n) { s = A[Number(n % B)] + s; n /= B; }
  return (neg ? '-' : '') + s;
}
const lines = fs.readFileSync('bench/holdout-ops/find-listing.txt', 'utf8').split('\n').filter(Boolean);
const vals = lines.map((l) => BigInt(l.split(/\s+/)[0].replace(/\D/g, '')));
const deltas: bigint[] = vals.map((v, i) => (i === 0 ? v : v - vals[i - 1]));
for (const [name, A, signed] of [['dec', '0123456789', false], ['b36', b36, false], ['b62', b62, false], ['b36+', b36, true], ['b62+', b62, true]] as any[]) {
  const strs = deltas.map((d) => (signed && d > 0n ? '+' : '') + rep(d, A));
  console.log(name.padEnd(5), 'chars=' + String(strs.join('\n').length).padStart(5), 'tokens=' + String(T(strs.join('\n'))).padStart(5));
}
