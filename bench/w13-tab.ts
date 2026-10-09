import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { synizesisEncode } from '../src/lib/omega/synizesis';
import { daedalusEncode } from '../src/lib/omega/daedalus';
const ENC: EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
for (const f of ['bench/holdout-tab/aapl-2014.csv','bench/holdout-tab/vix-daily-1990.csv']) {
  const t = fs.readFileSync(f,'utf8');
  const d = daedalusEncode(t, ENC, { budgetMs: 3000 });
  const s = synizesisEncode(t, ENC, { budgetMs: 3000 });
  console.log(f.padEnd(40), 'raw', T(t), 'DAED', d.decoded===t?d.messageTokens:-1, 'SYN', s.messageTokens, 'win', s.winner, 'exact', s.decoded===t, s.notes);
}
