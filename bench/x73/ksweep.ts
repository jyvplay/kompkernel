import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { columnize } from './colprobe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, enc);
  const out: string[] = [];
  for (let K = 2; K <= 10; K++) {
    const pl = columnize(t, K);
    if (!pl) { out.push(`K${K}:none`); continue; }
    out.push(`K${K}:${countTokens(pl.normal, enc)}(lit${pl.literal.length})`);
  }
  console.log(`${p.split('/').pop()} raw ${raw} | ${out.join(' ')}`);
}
