import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { codecEntries } from '../../src/lib/omega/registry';
const enc: any = 'o200k_base';
const t = fs.readFileSync(process.argv[2], 'utf8');
for (const key of process.argv.slice(3)) {
  const e = codecEntries().find(x => x.key === key)!;
  const r: any = await e.run(t, enc);
  console.log(`### ${key}: keys=${Object.keys(r).join(',')}`);
  for (const k of Object.keys(r)) {
    const v = r[k];
    if (typeof v === 'string' && v !== r.output) console.log(`   ${k} (${countTokens(v, enc)} tok): ${JSON.stringify(v.slice(0, 260))}`);
  }
}
