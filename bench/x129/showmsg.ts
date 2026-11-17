/** X130: emit a real metonomasia message so it can be handed to an LLM cold. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { metonomasiaEncode } from '../../src/lib/omega/metonomasia';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const p = process.env.LANE!;
const text = fs.readFileSync(p, 'utf8');
const a: any = tagstackEncode(text, enc);
const r = metonomasiaEncode(text, enc);
console.log(`LANE ${p}  raw=${countTokens(text, enc)}  frontier=${a.messageTokens}  metonomasia=${r ? r.tokens : a.messageTokens}`);
console.log('--- MESSAGE TO DECODE (begin) ---');
console.log(r ? r.message : a.message);
console.log('--- MESSAGE TO DECODE (end) ---');
console.log('--- SOURCE (begin) ---');
console.log(text);
console.log('--- SOURCE (end) ---');
