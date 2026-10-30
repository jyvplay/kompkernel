import * as fs from 'node:fs';
import { syzygiaEncode } from '../../src/lib/omega/syzygia';
const ENC = 'o200k_base' as const;
const lane = process.argv[2]!;
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const r: any = syzygiaEncode(text, ENC);
console.log(JSON.stringify({
  lane, applied: r.applied, exact: r.exact && r.decoded === text,
  messageTokens: r.messageTokens, parentTokens: r.parentTokens, parentCodec: r.parentCodec,
  candidateTokens: r.candidateTokens, candidateExact: r.candidateExact,
  candidateParentCodec: r.candidateParentCodec, candidateParentTokens: r.candidateParentTokens,
  comparison: r.comparison, fullFrontierMeasured: r.fullFrontierMeasured,
  ms: Date.now() - t0, notes: r.notes,
}, null, 2));
