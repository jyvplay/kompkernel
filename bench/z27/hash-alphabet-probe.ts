// Tokens per bit for random bytes written in readable ASCII alphabets (what a model would see in a lockfile or log).
import crypto from 'node:crypto';
import { countTokens } from '@/lib/omega/bpe';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase(buf: Buffer, alpha: string): string {
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  if (alpha.length === 64 || alpha.length === 32) {
    const w = alpha.length === 64 ? 6 : 5;
    for (let i = 0; i + w <= bits.length; i += w) out += alpha[parseInt(bits.slice(i, i + w), 2)];
  } else { // base58 via big integer
    let n = BigInt('0x' + buf.toString('hex')); let s = '';
    while (n > 0n) { s = alpha[Number(n % 58n)] + s; n /= 58n; }
    out = s;
  }
  return out;
}
const buf = crypto.randomBytes(20000); // fixed seed not needed: real random bytes; result is a statistic over 20 KB
const cases: [string, string][] = [
  ['hex (4 bit/char)', buf.toString('hex')],
  ['base32 (5 bit/char)', toBase(buf, B32)],
  ['base58 (~5.86 bit/char)', toBase(buf, B58)],
  ['base64 (6 bit/char)', buf.toString('base64').replace(/=+$/, '')],
];
for (const [name, s] of cases) {
  const t = countTokens(s, 'o200k_base');
  const bits = buf.length * 8;
  console.log(`${name}: chars=${s.length} tokens=${t} bits/token=${(bits / t).toFixed(2)} chars/token=${(s.length / t).toFixed(2)}`);
}
