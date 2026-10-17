import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const d: any = daedalusEncode(t, 'o200k_base' as any);
const wire: string = d.wire;
console.log('mode', d.mode, 'inTokens', d.inTokens, 'outTokens', d.outTokens, 'msgTokens', d.messageTokens);
console.log('wire len', wire.length);
const si = wire.indexOf('§'), pi = wire.indexOf('¶');
if (si >= 0 && pi > si) {
  const tape = wire.slice(si + 1, pi);
  const script = CHIRON_SCRIPTS[0];
  const rules = chironParseTape(tape, script) || [];
  console.log('rules in tape:', rules.length);
  const counts = new Map<string, number>();
  for (const r of rules) counts.set(r.raw, (counts.get(r.raw) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => a[1] - b[1]).slice(-14);
  for (const [raw, c] of top) console.log('  ', JSON.stringify(raw.slice(0, 40)), 'len', raw.length);
}
