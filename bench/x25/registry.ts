import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
const enc = 'o200k_base' as any;
const key = 'aetos';
const entry: any = codecEntries().find((e: any) => e.key === key);
if (!entry) { console.log('KEY NOT FOUND'); process.exit(1); }
console.log('found registry key', key, '| label', entry.label.slice(0, 40));
for (const f of (process.env.F || 'bench/holdout-ops/git-log-fuller.txt').split(',')) {
  const t = fs.readFileSync(f, 'utf8');
  const r = await entry.run(t, enc);
  const ok = r.decoded === t;
  console.log(f.split('/').pop()!.padEnd(30), 'exact', String(ok).padStart(5),
    '| oneChat', String(r.oneChat).padStart(5), '| out', String(r.output.length).padStart(6), 'bytes');
  console.log('   note:', String(r.note).slice(0, 150));
}
