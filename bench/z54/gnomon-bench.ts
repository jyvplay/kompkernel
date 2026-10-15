// z54: GNOMON vs DAEDALUS frontier on each lane (exact M, contract counted). usage: bench/tmp/run.sh bench/z54/gnomon-bench.ts <files>
import fs from 'node:fs';
import { gnomonEncode } from '@/lib/omega/gnomon';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = gnomonEncode(text, 'o200k_base');
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: r.inTokens, frontierM: r.frontierM, gnomonM: r.messageTokens, delta: r.messageTokens - r.frontierM, chosen: r.rules.join('+') || 'plain', fields: r.fields, exact: r.exact, candidates: r.candidates }));
}
