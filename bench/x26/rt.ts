import fs from 'node:fs';
import { symplokeEncode, symplokeDecode, symplokeContract, symplokeTapeNests } from '@/lib/omega/symploke';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
for (const f of (process.env.F || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = symplokeEncode(t, enc);
  const dt = Date.now() - t0;
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  let ok = false;
  try { ok = symplokeDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t; } catch (e) { /* noop */ }
  console.log(f.split('/').pop()!.padEnd(38), 'exact', String(ok).padStart(5),
    '| in', String(r.inTokens).padStart(5), '-> msg', String(r.messageTokens).padStart(5),
    '| wire', String(T(r.wire)).padStart(5), 'ctr', String(r.messageTokens - T(r.wire)).padStart(3),
    '|', (r.parent + '/' + r.order).padEnd(16), '|', r.shapes.join(' ') || '-', '|', dt + 'ms');
  if (process.env.SHOWC) console.log('   CONTRACT:', JSON.stringify(r.contract));
}
