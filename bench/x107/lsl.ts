/** X107 — the one lane v1 never finished: ls-l-real's OFF arm only. */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1'; process.env.OMEGA_NO_PERIKOPI='1';
const enc:any='o200k_base';
const p='bench/holdout-x41/ls-l-real.txt';
const text=fs.readFileSync(p,'utf8');
const t1=Date.now();
const r:any=tagstackEncode(text,enc);
const line=`${p}\toff\t${r.messageTokens}\t${r.decoded===text}\t${r.parentCodec}\t0\t0\t-\tSINGLE\n`;
fs.appendFileSync('bench/x107/receipts/perikopi.log', line);
console.log(`ls-l-real OFF ${r.messageTokens} exact ${r.decoded===text} parent ${r.parentCodec} ms ${Date.now()-t1}`);
