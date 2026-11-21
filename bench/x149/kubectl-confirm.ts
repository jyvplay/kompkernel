// X149: kubectl with ΠΟΛΥΣΤΗΛΗ default-OFF must reproduce the canonical 300 wire.
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const text = fs.readFileSync('bench/holdout-tbl/kubectl-get-pods.txt', 'utf8');
const a = tagstackEncode(text, 'o200k_base');
const pre = JSON.parse(fs.readFileSync('bench/x149/receipts/frontier.jsonl', 'utf8').trim().split('\n').find((l) => l.includes('kubectl'))!);
console.log(JSON.stringify({ tokens: a.messageTokens, byteIdentical: a.message === pre.message, decoded: a.decoded === text }));
