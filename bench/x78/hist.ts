import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { __x78hist } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const r: any = tagstackEncode(fs.readFileSync(p, 'utf8'), enc);
  const h: any = __x78hist();
  const L = ['<24', '24-63', '64-255', '256-1K', '1K-4K', '4K-16K', '16K-64K', '64K+'];
  const tot = h.calls || 1;
  console.log(`${p.split('/').pop()} calls ${h.calls} chars ${(h.chars / 1e6).toFixed(1)}M | ` +
    h.buckets.map((v: number, i: number) => `${L[i]}=${(100 * v / tot).toFixed(1)}%`).join(' '));
}
