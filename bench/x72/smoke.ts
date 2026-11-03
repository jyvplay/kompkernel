import * as fs from 'node:fs';
import { codecEntries } from '../../src/lib/omega/registry';
const e = codecEntries().find(x => x.key === 'stadion');
if (!e) { console.error('stadion not registered'); process.exit(1); }
(async () => {
  for (const p of ['bench/holdout-x42/lsblk.txt', 'bench/holdout-x42b/free-m.txt']) {
    const t = fs.readFileSync(p, 'utf8');
    const r: any = await e.run(t, 'o200k_base' as any);
    console.log(`${p}: oneChat=${r.oneChat} roundTrip=${r.decoded === t} note=${r.note}`);
  }
})();
