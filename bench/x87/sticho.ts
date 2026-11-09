import * as fs from 'node:fs';
import { stichomythiaEncode, STICHOMYTHIA_KEY } from '../../src/lib/omega/stichomythia';
import { countTokens } from '../../src/lib/omega/bpe';
console.log('KEY tokens:', countTokens(STICHOMYTHIA_KEY, 'o200k_base'));
console.log('KEY:', JSON.stringify(STICHOMYTHIA_KEY).slice(0, 400));
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const r = stichomythiaEncode(S, 'o200k_base');
  console.log(`\n== ${p.split('/').pop()} raw=${countTokens(S,'o200k_base')} msg=${r.messageTokens} applied=${r.applied} exact=${r.exact} rows=${r.rows} cols=${r.cols} contract=${r.contractTokens} rt=${r.decoded===S}`);
  console.log('   models: ' + JSON.stringify(r.models));
  console.log('   notes: ' + r.notes.slice(0, 160));
  console.log('   message: ' + JSON.stringify(r.message.slice(0, 420)));
}
