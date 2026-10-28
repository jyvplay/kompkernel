// X53 (X52 task 2): airport-codes-300 full TAGSTACK+SIBLING gate via SYLLOGISMOS.
import * as fs from 'node:fs';
import { syllogismosEncode } from '../../src/lib/omega/syllogismos';
const ENC = 'o200k_base' as const;
const lane = 'bench/z48/corpus/airport-codes-300.csv';
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const r: any = syllogismosEncode(text, ENC);
console.log(JSON.stringify({
  lane, applied: r.applied, exact: r.exact && r.decoded === text,
  messageTokens: r.messageTokens, parentTokens: r.parentTokens, parentCodec: r.parentCodec,
  candidateTokens: r.candidateTokens, candidateExact: r.candidateExact,
  comparison: r.comparison, fullFrontierMeasured: r.fullFrontierMeasured,
  ms: Date.now() - t0, notes: r.notes,
}, null, 2));
