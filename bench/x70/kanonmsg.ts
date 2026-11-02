import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { kanonEncode } from '../../src/lib/omega/kanon';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = kanonEncode(text, enc);
  console.log('==== ' + p + ' M=' + r.messageTokens + ' exact=' + (r.decoded === text), 'winner=' + r.winner);
  console.log('GATE', JSON.stringify(r.gate));
  console.log('--- decoderPrompt (' + countTokens(r.decoderPrompt ?? '', enc) + ' tok) ---');
  console.log(r.decoderPrompt);
  console.log('--- wire (' + countTokens(r.wire ?? '', enc) + ' tok) ---');
  console.log(r.wire);
  console.log('--- notes ---'); console.log(r.notes);
}
