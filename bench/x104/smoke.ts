/** X104 — cheap exactness smoke test for ΤΑΞΙΝΟΜΗΣΙΣ on the three smallest lanes. */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { chironDecode } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
const lanes = ['bench/holdout-x42/lsblk.txt', 'bench/holdout-x42b/free-m.txt', 'bench/holdout-x41/df-real.txt'];
for (const pol of ['insertion', 'count', 'short', 'exact']) {
  process.env.OMEGA_TAXINOMASIS = pol;
  const out: string[] = [];
  for (const p of lanes) {
    const text = fs.readFileSync(p, 'utf8');
    const r: any = tagstackFrontier(text, 'o200k_base' as any);
    out.push(`${p.split('/').pop()}=${r.messageTokens}${r.decoded === text ? '' : '!INEXACT'}`);
  }
  console.log(`${pol.padEnd(10)} ${out.join('  ')}`);
}
