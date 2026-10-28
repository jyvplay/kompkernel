// X53: segmented member bench for DIPTYCHON variants. Usage: parent lane side
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { diptychonPlan } from '../../src/lib/omega/diptychon';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
const [parent, lane, side] = process.argv.slice(2) as [string, string, string];
const text = fs.readFileSync(lane, 'utf8');
const plan = diptychonPlan(text, ENC);
if (!plan) { console.log(JSON.stringify({ lane, parent, side, error: 'no plan' })); process.exit(0); }
const tx = side === 'reduced' ? plan.reducedText : text;
const t0 = Date.now();
let tokens: number;
if (parent === 'daedalus') { const d = daedalusEncode(tx, ENC); if (!d.exact || d.decoded !== tx) throw new Error('dae'); tokens = d.messageTokens; }
else if (parent === 'akolouthia2') { const a = akolouthia2Encode(tx, ENC); if (!a.exact || a.decoded !== tx) throw new Error('ako2'); tokens = T(a.decoderPrompt); }
else { const g: any = apographeEncode(tx, ENC); if (apographeDecodeResult(g) !== tx) throw new Error('apo'); tokens = T((g.contract ? g.contract + '\n' : '') + g.wire); }
console.log(JSON.stringify({ lane, parent, side, tokens, ms: Date.now() - t0, contractTok: T(plan.contract), fmt: plan.spec.format, rawTok: T(text) }));
