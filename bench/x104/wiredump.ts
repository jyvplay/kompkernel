/** X104 — dump the complete wire for one lane, for byte-diffing across runs. */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const lane = process.argv[2], out = process.argv[3];
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
const text = fs.readFileSync(lane, 'utf8');
const R: any = tagstackEncode(text, 'o200k_base' as any);
fs.writeFileSync(out, JSON.stringify({ tokens: R.messageTokens, wire: R.wire, contract: R.contract, rules: R.rules, parent: R.parent }, null, 1));
console.log('tokens', R.messageTokens, 'bytes', R.wire.length, 'rules', R.rules, 'parent', R.parent);
