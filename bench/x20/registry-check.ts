import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';
const entries = codecEntries();
const keys = new Set(entries.map(e => e.key));
if (!keys.has('morphe')) throw new Error('morphe NOT in registry');
const mor = entries.find(e => e.key === 'morphe')!;
const stg = entries.find(e => e.key === 'stigme')!;
console.log('registry entries:', entries.length, '| morphe present: true');
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const ident = countTokens(t, 'o200k_base');
  const m = await mor.run(t, 'o200k_base');
  const s = await stg.run(t, 'o200k_base');
  const ok = m.decoded === t;
  console.log(`${f.split('/').pop()!.padEnd(22)} ident ${String(ident).padStart(5)}  stigme ${String(s.oneChat).padStart(5)}  morphe ${String(m.oneChat).padStart(5)}  exact=${ok}  ${m.note}`);
}
