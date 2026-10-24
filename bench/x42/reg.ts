/** X42: the codec is reachable the way a reader reaches every other codec. */
import { codecEntries } from '@/lib/omega/registry';
import { kannabosEncode } from '@/lib/omega/kannabos';
const e = codecEntries().find((c: any) => c.key === 'kannabos') as any;
if (!e) throw new Error('kannabos NOT in registry');
const trips = ['bench/holdout-tbl/df-h.txt'];
(async () => {
  const fs = await import('node:fs');
  for (const p of trips) {
    const t = fs.readFileSync(p, 'utf8');
    const r: any = await e.run(t, 'o200k_base');
    console.log(e.key, '| label:', String(e.label).slice(0, 60), '| wire?', typeof r.output === 'string',
      '| oneChat:', r.oneChat, '| decoded===source:', r.decoded === t, '| note:', String(r.note).slice(0, 60));
  }
  console.log("registry entries:", codecEntries().length);
})();
