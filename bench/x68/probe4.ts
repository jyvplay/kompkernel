import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode } from '../../src/lib/omega/apographe';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const a: any = apographeEncode(t, enc);
  console.log('==', f, 'raw', countTokens(t, enc));
  for (const k of ['messageTokens','inTokens','parent','parentWireTokens','wireTokens','rules','delta','winner','arms','alphabet','marker','estimatedSaving','apographeLifts','apographeClause','apographeHeader','apographeProxyGain','apographeParentTokens','rungs','inGate','inCap']) {
    const v = a[k];
    console.log(' ', k, JSON.stringify(v)?.slice(0, 400));
  }
}
