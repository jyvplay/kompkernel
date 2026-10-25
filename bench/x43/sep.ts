/** X43: is the column separator the dominant term? Measure, do not argue. */
import * as fs from 'node:fs';
import { kannabosPlan, kannabosWire } from '@/lib/omega/kannabos';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(p, 'utf8');
  const plan: any = kannabosPlan(t, enc);
  if (!plan) { console.log(p.split('/').pop(), 'no plan'); continue; }
  const w = kannabosWire(plan, t)!;
  const parts = w.split('\n');
  const body = parts.slice(1).join('\n');
  const sepTok = countTokens('\u241f', enc);
  const alt = body.split('\u241f').join('\n');
  console.log(p.split('/').pop(),
    'wire=' + countTokens(w, enc),
    'sepTok=' + sepTok,
    'bodies=' + (body.split('\u241f').length - 1),
    'wireNewlineSep=' + (countTokens(w, enc) - countTokens(body, enc) + countTokens(alt, enc)));
}
