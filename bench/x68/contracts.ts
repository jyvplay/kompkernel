import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { metronEncode } from '../../src/lib/omega/metron';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { apographeEncode } from '../../src/lib/omega/apographe';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const s: any = synkrisisEncode(t, enc);
  const m: any = metronEncode(t, enc);
  const d: any = diastemaEncode(t, enc);
  const a: any = apographeEncode(t, enc);
  const rep = (name: string, r: any, msg: string) => ({ name, total: countTokens(msg, enc), contract: r.contract ? countTokens(r.contract, enc) : null, contractHead: r.contract ? r.contract.slice(0, 160) : null, wireTokens: r.wire ? countTokens(r.wire, enc) : null });
  console.log(JSON.stringify({ f, raw: countTokens(t, enc),
    syn: rep('synkrisis', s, s.message), met: rep('metron', m, (m.contract ? m.contract + '\n' : '') + m.wire),
    dia: rep('diastema', d, (d.contract ? d.contract + '\n' : '') + d.wire), apo: rep('apographe', a, (a.contract ? a.contract + '\n' : '') + a.wire) }, null, 1));
}
