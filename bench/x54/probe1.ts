// X54 probe: member prices for a balance-column recurrence elision on
// statement_A (reduced built by hand in Python beforehand).
// Usage: node probe1.mjs <parent> <orig|reduced>
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);
const [parent, lane, side] = process.argv.slice(2) as [string, string, string];
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now(); let tokens: number;
if (parent === 'akolouthia2') { const a = akolouthia2Encode(text, ENC); if (!a.exact || a.decoded !== text) throw new Error('ako'); tokens = T(a.decoderPrompt); }
else if (parent === 'daedalus') { const d = daedalusEncode(text, ENC); if (!d.exact || d.decoded !== text) throw new Error('dae'); tokens = d.messageTokens; }
else { const g: any = apographeEncode(text, ENC); if (apographeDecodeResult(g) !== text) throw new Error('apo'); tokens = T((g.contract ? g.contract + '\n' : '') + g.wire); }
console.log(JSON.stringify({ parent, lane, side, tokens, ms: Date.now() - t0, rawTok: T(text) }));
