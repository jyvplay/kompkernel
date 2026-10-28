import fs from 'node:fs';
import { codecEntries } from '../../src/lib/omega/registry';
const enc = 'o200k_base' as const;
const entries = codecEntries();
const lanes = process.argv.slice(2);
const KEYS = (process.env.KEYS || 'daedalus,daedalus-dual,dendrons,dendron,diastema,oura,hydra,kiones,akolouthia2,apographe,kannabos,metron,kolumn,stigme,euteleia,anadiplosis,tagstack,sibling-template').split(',');
for (const f of lanes) {
  const text = fs.readFileSync(f, 'utf8');
  console.log('==== ' + f + ' chars=' + text.length);
  const out: any = {};
  for (const k of KEYS) {
    const e: any = entries.find((x: any) => x.key === k);
    if (!e) { out[k] = 'missing'; continue; }
    try {
      const r: any = await e.run(text, enc);
      const exact = r.decoded === text;
      out[k] = exact ? r.oneChat : `INEXACT(${r.oneChat})`;
    } catch (err: any) { out[k] = 'ERR:' + String(err?.message ?? err).slice(0, 50); }
  }
  console.log(JSON.stringify(out));
}
