// X53 probe5: worst-ratio lane hunt (one lane per process invocation to avoid budget bleed)
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const ENC = 'o200k_base' as const;
const lane = process.argv[2]!;
const s = fs.readFileSync(lane, 'utf8');
const raw = countTokens(s, ENC);
const t0 = Date.now();
const d = daedalusEncode(s, ENC, { budgetMs: 300_000 });
console.log(JSON.stringify({ lane, chars: s.length, raw, daed: d.exact && d.decoded === s ? d.messageTokens : null, ratio: d.messageTokens / raw, ms: Date.now() - t0 }));
