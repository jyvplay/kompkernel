import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { daedalusDualEncode } from '../../src/lib/omega/daedalus-dual';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  console.log('==', f, 'raw', countTokens(t, enc));
  try {
    const d: any = daedalusEncode(t, enc);
    console.log(' daedalus keys', Object.keys(d).join(','));
    for (const k of ['messageTokens','wireTokens','inTokens','arm','armTokens','arms','rules','contractTokens','notes','applied']) {
      if (k in d) console.log('  ', k, JSON.stringify(d[k]).slice(0, 600));
    }
  } catch (e: any) { console.log(' ERR', e.message); }
}
