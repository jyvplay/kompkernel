// X20: per-lane message composition for the frontier keys. Prints JSON rows.
import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const KEYS = (process.env.KEYS ?? 'daedalus,daedalus-dual,lakonikos-d,akolouthia2,dendrons,dendron,gramma,phalanx-a10').split(',');
const entries = codecEntries();
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const row: any = { file: f, chars: text.length, rawTok: countTokens(text, enc) };
  for (const k of KEYS) {
    const e: any = entries.find((x: any) => x.key === k);
    if (!e) { row[k] = 'missing'; continue; }
    try {
      const r: any = await e.run(text, enc);
      row[k] = r.decoded === text ? r.oneChat : `INEXACT(${r.oneChat})`;
      if (process.env.SHOW === k) row['_wire_' + k] = String(r.output).slice(0, 4000);
      if (process.env.NOTE === k) row['_note_' + k] = String(r.note ?? '').slice(0, 500);
    } catch (err: any) { row[k] = 'ERR:' + String(err?.message ?? err).slice(0, 80); }
  }
  const nums = KEYS.map(k => row[k]).filter((v: any) => typeof v === 'number');
  row.min = Math.min(...nums);
  console.log(JSON.stringify(row));
}
