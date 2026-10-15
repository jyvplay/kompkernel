// z52: one-chat M of the named stack candidates on a lane, via the registry's own run() (exactness checked).
// The stack frontier on a lane is the minimum over these exact candidates. usage: bench/tmp/run.sh bench/z52/frontier-min.ts <file>
import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
const KEYS = process.env.FM_KEYS ? process.env.FM_KEYS.split(',') : ['daedalus', 'daedalus-dual', 'paradeigma', 'phalanx-a10', 'gramma', 'dendron', 'dendrons', 'elleipsis'];
const enc = 'o200k_base' as const;
const entries = codecEntries();
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const out: Record<string, number | string> = {};
  for (const k of KEYS) {
    const e: any = entries.find((x: any) => x.key === k);
    if (!e) { out[k] = 'missing'; continue; }
    try {
      const r: any = await e.run(text, enc);
      const exact = r.decoded === text;
      out[k] = exact ? r.oneChat : `INEXACT(${r.oneChat})`;
    } catch (err: any) { out[k] = 'ERR:' + String(err?.message ?? err).slice(0, 60); }
  }
  const nums = KEYS.map(k => out[k]).filter((v): v is number => typeof v === 'number');
  console.log(JSON.stringify({ file: f, raw: fs.readFileSync(f,'utf8').length, ...out, frontierMin: Math.min(...nums) }));
}
