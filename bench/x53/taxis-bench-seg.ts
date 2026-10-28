// X53 segmented bench: ONE parent on orig|reduced per invocation. Usage: parent lane
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { taxisPlan } from '../../src/lib/omega/taxis';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
const [parent, lane] = process.argv.slice(2) as [string, string];
const text = fs.readFileSync(lane, 'utf8');
const plan = taxisPlan(text, ENC);
if (!plan) { console.log(JSON.stringify({ lane, parent, error: 'no plan' })); process.exit(0); }
function measure(tx: string): number {
  if (parent === 'daedalus') { const d = daedalusEncode(tx, ENC); if (!d.exact || d.decoded !== tx) throw new Error('dae'); return d.messageTokens; }
  if (parent === 'akolouthia2') { const a = akolouthia2Encode(tx, ENC); if (!a.exact || a.decoded !== tx) throw new Error('ako2'); return T(a.decoderPrompt); }
  const g: any = apographeEncode(tx, ENC); if (apographeDecodeResult(g) !== tx) throw new Error('apo'); return T((g.contract ? g.contract + '\n' : '') + g.wire);
}
const side = process.argv[4] as string;
const tx = side === 'reduced' ? plan.reducedText : text;
const t0 = Date.now();
const tokens = measure(tx);
console.log(JSON.stringify({ lane, parent, side, tokens, ms: Date.now() - t0, contractTok: T(plan.contract), rawTok: T(text) }));
