import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = ouraEncode(t, ENC);
  console.log('\n#### ' + p.split('/').pop(), 'raw=' + countTokens(t, ENC), 'M=' + r.messageTokens,
    'parent=' + r.apographeParentTokens, 'fired=' + r.apographe);
  console.log('contract:', JSON.stringify(r.contract).slice(0, 400));
  console.log('wire[0:900]:', JSON.stringify(r.wire.slice(0, 900)));
}
