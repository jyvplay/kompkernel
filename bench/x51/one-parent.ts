// X51: measure ONE parent on (original|reduced) for a lane; prints one JSON line.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { syllogismosPlan, syllogismosRestore } from '../../src/lib/omega/syllogismos';
const ENC = 'o200k_base' as const;
const [parent, which, lane] = process.argv.slice(2) as [string, string, string];
const text = fs.readFileSync(lane, 'utf8');
const plan = syllogismosPlan(text, ENC); if (!plan) throw new Error('no plan');
if (syllogismosRestore(plan.reducedText, plan.spec) !== text) throw new Error('plan round trip');
fs.mkdirSync('bench/x51/tmp-cross', { recursive: true });
const nm = lane.split('/').pop()!.replace(/[^\w.-]/g, '_');
fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.orig`, text);
fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.reduced`, plan.reducedText);
fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.spec.json`, JSON.stringify(plan.spec));
fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.message.txt`, plan.contract + '\n' + plan.reducedText);
const tx = which === 'reduced' ? plan.reducedText : text;
const t0 = Date.now(); let tokens: number;
if (parent === 'daedalus') { const d = daedalusEncode(tx, ENC); if (!d.exact || d.decoded !== tx) throw new Error('dae'); tokens = d.messageTokens; }
else if (parent === 'ako2') { const a = akolouthia2Encode(tx, ENC); if (!a.exact || a.decoded !== tx) throw new Error('ako'); tokens = countTokens(a.decoderPrompt, ENC); }
else if (parent === 'apographe') { const g: any = apographeEncode(tx, ENC); if (apographeDecodeResult(g) !== tx) throw new Error('apo'); tokens = countTokens((g.contract ? g.contract + '\n' : '') + g.wire, ENC); }
else throw new Error('parent?');
console.log(JSON.stringify({ lane, parent, which, tokens, ms: Date.now() - t0, contractTok: countTokens(plan.contract, ENC), rawTok: countTokens(text, ENC), reducedRawTok: countTokens(plan.reducedText, ENC) }));
