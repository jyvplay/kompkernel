import fs from 'node:fs';
import { typosEncode } from '@/lib/omega/typos';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  let t0 = Date.now(); const a = lakonikosDualEncode(t); const t1 = Date.now() - t0;
  t0 = Date.now(); const b = typosEncode(t); const t2 = Date.now() - t0;
  console.log(JSON.stringify({ lane: f.split('/').pop(), bytes: t.length, lakonikosD_ms: t1, lakonikosD_M: a.messageTokens.o200k_base, typos_ms: t2, typos_M: b.messageTokens.o200k_base, rule: b.rule }));
}
