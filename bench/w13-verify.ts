import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { synizesisEncode } from '../src/lib/omega/synizesis';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import { allFixtures } from './synizesis-fixtures';
const ENC: EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const want = ['synth/syslog-30','synth/iso-log-40','tab/vix-daily-1990.csv','tab/aapl-2014.csv','synth/csv-txn-30','synth/jsonlog-30','synth/nginx-35'];
for (const f of allFixtures()) {
  if (!want.includes(f.name)) continue;
  const d = daedalusEncode(f.text, ENC, { budgetMs: 2500 });
  const s = synizesisEncode(f.text, ENC, { budgetMs: 2500 });
  const dT = d.decoded===f.text ? d.messageTokens : T(f.text);
  console.log(f.name.padEnd(24), 'raw', String(T(f.text)).padStart(5), 'DAED', String(dT).padStart(5), 'SYN', String(s.messageTokens).padStart(5), 'Δ', String(dT-s.messageTokens).padStart(4), ((dT-s.messageTokens)/dT*100).toFixed(1)+'%', 'exact', s.decoded===f.text, s.winner);
}
