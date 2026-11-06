/**
 * X75 / t11 — DOES THE FRONTIER AMORTIZE ITS KEY ACROSS SEVERAL OUTPUTS IN ONE MESSAGE?
 *
 * Everyday artifact: a terminal session where a person pastes three or four command
 * outputs into one message. Measured: (a) the frontier on the concatenation, (b) the sum
 * of the frontier on each part, (c) the difference — i.e. does the single contract get
 * paid once or N times?
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const parts = process.argv.slice(2).map((p) => ({ p, t: fs.readFileSync(p, 'utf8') }));
let sum = 0;
for (const x of parts) { const r: any = tagstackFrontier(x.t, enc); sum += r.messageTokens; console.log(`  part ${x.p.split('/').pop()!.padEnd(20)} ${String(r.messageTokens).padStart(5)} tok  ${String(r.notes).split(' ')[0]}`); }
const joined = parts.map((x) => x.t).join('\n');
const one: any = tagstackFrontier(joined, enc);
// also each part separately CONCATENATED as messages
const concatMsgs = parts.map((x) => (tagstackFrontier(x.t, enc) as any).message).join('\n');
console.log(`\nsum of per-part messages ${sum}`);
console.log(`frontier(concatenated sources) ${one.messageTokens}  (delta ${one.messageTokens - sum}) parent ${one.parentCodec}`);
console.log(`concatenated per-part MESSAGES  ${T(concatMsgs, enc)}  (delta ${T(concatMsgs, enc) - sum})`);
console.log(`raw concatenation ${T(joined, enc)}`);
