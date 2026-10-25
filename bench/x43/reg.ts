/** X43: DIASTEMA is reachable the way a reader reaches every other codec. */
import { codecEntries } from '@/lib/omega/registry';
const e = codecEntries().find((c: any) => c.key === 'diastema') as any;
if (!e) throw new Error('diastema NOT in registry');
const trips = ['bench/holdout-ops/find-listing.txt'];
(async () => {
  const fs = await import('node:fs');
  for (const p of trips) {
    const t = fs.readFileSync(p, 'utf8');
    const r: any = await e.run(t, 'o200k_base');
    console.log(e.key, '| family:', e.family, '| fidelity:', e.fidelity, '| wire?', typeof r.output === 'string',
      '| oneChat:', r.oneChat, '| decoded===source:', r.decoded === t, '| note:', String(r.note).slice(0, 90));
  }
  console.log('registry entries:', codecEntries().length);
})();
