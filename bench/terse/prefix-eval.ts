import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironEncode, KAIROS_WORK_UNITS } from '../../src/lib/omega/chiron';
import { elideEncode, elideDecode } from './prefix-elide';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const e = elideEncode(t);
  const roundtrip = elideDecode(e) === t;
  const base = chironEncode(t, 'o200k_base', { workUnits: 8_000_000 });
  const tr = chironEncode(e, 'o200k_base', { workUnits: 8_000_000 });
  console.log(JSON.stringify({ file: f.split('/').slice(-2).join('/'), raw: countTokens(t, 'o200k_base'), elideRoundTrip: roundtrip,
    kairos_raw_msg: base.messageTokens, kairos_elide_msg: tr.messageTokens, elideOnlyTok: countTokens(e, 'o200k_base'),
    chironExact: base.decoded === t, elideChironExact: tr.decoded === e }));
}
