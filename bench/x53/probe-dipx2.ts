import * as fs from 'node:fs';
import { diptychonPlan } from '../../src/lib/omega/diptychon';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
for (const f of ['bench/x53/fixtures2/od-x2.txt','bench/x53/fixtures2/od-x1nogutter.txt','bench/x53/fixtures2/xcc-array.txt']) {
  const t = fs.readFileSync(f, 'utf8');
  const p = diptychonPlan(t, ENC);
  console.log(f, 'rawTok', countTokens(t, ENC), p ? `PLAN fmt=${(p as any).fmt ?? (p as any).format ?? '?'} redTok=${countTokens((p as any).reducedText, ENC)} contractTok=${countTokens((p as any).contract, ENC)}` : 'NO PLAN');
}
