import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode } from '../../src/lib/omega/apographe';

const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = apographeEncode(text, enc);
  const ms = Date.now() - t0;
  if (p === process.argv[2]) console.log('KEYS', Object.keys(r).filter(k=>typeof r[k]==='string'||typeof r[k]==='number').join(','));
  const msg = r.message ?? '';
  console.log(JSON.stringify({ p, chars: text.length, raw: countTokens(text, enc), msgTok: r.messageTokens, msgChars: msg.length, wireChars: (r.wire??'').length, wireTok: r.wire?countTokens(r.wire, enc):null, exact: r.decoded === text, ms }, null, 0));
  console.log('HEAD:', msg.slice(0,400));
}
