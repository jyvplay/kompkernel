import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { COUNT_STAT } from '../../src/lib/omega/bpe';
import { RELAYOUT_STAT } from '../../src/lib/omega/metathesis';
for (const p of (process.argv[2] ? [process.argv[2]] : ['bench/holdout-x41/ls-l-real.txt','bench/holdout-x42/dpkg-l.txt'])) {
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r = tagstackEncode(t, 'o200k_base');
  console.log(p.split('/').pop(), 'tokens', r.messageTokens, 'exact', r.decoded === t, 'ms', Date.now() - t0);
  console.log('   COUNT', JSON.stringify(COUNT_STAT));
  console.log('   RELAYOUT', JSON.stringify(RELAYOUT_STAT));
  for (const k of Object.keys(COUNT_STAT) as any[]) (COUNT_STAT as any)[k] = 0;
  for (const k of Object.keys(RELAYOUT_STAT) as any[]) (RELAYOUT_STAT as any)[k] = 0;
}
