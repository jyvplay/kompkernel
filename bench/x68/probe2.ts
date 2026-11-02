import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode } from '../../src/lib/omega/apographe';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const a = apographeEncode(t, enc);
  console.log('=== ' + f + ' raw ' + countTokens(t, enc));
  console.log('contract tok', a.contract ? countTokens(a.contract, enc) : 0, 'wire tok', countTokens(a.wire, enc), 'total', countTokens((a.contract?a.contract+'\n':'')+a.wire, enc));
  console.log('wire chars', a.wire.length, 'source chars', t.length);
  console.log('WIRE HEAD:\n' + a.wire.slice(0, 1500));
}
