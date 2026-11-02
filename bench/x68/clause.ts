import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { metronEncode } from '../../src/lib/omega/metron';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { diastemaEncode } from '../../src/lib/omega/diastema';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  for (const [name, fn] of [['metron', metronEncode], ['synkrisis', synkrisisEncode], ['diastema', diastemaEncode]] as any) {
    const r: any = fn(t, enc);
    if (!r.contract) continue;
    console.log('==', f.split('/').pop(), name, 'contract', countTokens(r.contract, enc), 'wire', r.wire ? countTokens(r.wire, enc) : '?');
    console.log(JSON.stringify(r.contract));
  }
}
