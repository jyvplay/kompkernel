import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { metronEncode } from '../../src/lib/omega/metron';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const enc: any = 'o200k_base';
const t = fs.readFileSync(process.argv[2], 'utf8');
const m: any = metronEncode(t, enc);
const s: any = synkrisisEncode(t, enc);
const a: any = akolouthia2Encode(t, enc);
for (const [n, r] of [['metron', m], ['synkrisis', s]] as Array<[string, any]>) {
  console.log('=== ' + n + ' contract (' + (r.contract ? countTokens(r.contract, enc) : 0) + ' tok):');
  for (const sent of (r.contract ?? '').split(/(?<=\.)\s+/)) console.log('  [' + countTokens(sent, enc) + '] ' + sent);
}
