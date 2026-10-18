/**
 * X27 probe 3: which CHIRON ops do our wires actually use?
 *
 * chiron.ts implements five ops -- plain rules, REP (repeat a unit n times),
 * FILL (repeat with a filler between copies), RANGE (`a..b` list expansion) and
 * SPLIT (expand a delimited string into a list). chironContract already emits a
 * clause per op that is actually present, so an op that never fires costs
 * nothing today and is pure unexploited headroom. Measure what fires.
 */
import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { chironOpsUsed, CHIRON_REP, CHIRON_LIST } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;

const files = (process.env.F || '').split(',').filter(Boolean);
const tally: Record<string, number> = { rules: 0, rep: 0, fill: 0, range: 0, split: 0 };
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = symplokeEncode(t, enc);
  const u = chironOpsUsed(r.wire);
  for (const k of Object.keys(tally)) if ((u as any)[k]) tally[k]++;
  console.log(f.split('/').pop()!.padEnd(38),
    'rules', String(u.rules).padStart(5), 'rep', String(u.rep).padStart(5),
    'fill', String(u.fill).padStart(5), 'range', String(u.range).padStart(5),
    'split', String(u.split).padStart(5));
}
console.log('\nTALLY over', files.length, 'lanes:', JSON.stringify(tally));
console.log('CHIRON_REP =', JSON.stringify(CHIRON_REP), ' CHIRON_LIST =', JSON.stringify(CHIRON_LIST));
