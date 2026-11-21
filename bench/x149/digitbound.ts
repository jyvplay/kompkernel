// gross upper bound of ANY numeric re-coding: collapse every digit run to '0'
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const rows = fs.readFileSync('bench/x149/receipts/frontier.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l)) as any[];
let t = 0;
for (const r of rows) {
  const g = countTokens(r.message, 'o200k_base') - countTokens(r.message.replace(/\d+/g, '0'), 'o200k_base');
  t += g;
  if (g > 8) console.log('NUM', r.path.split('/').pop(), '<=', g);
}
console.log('NUM_TOTAL_UPPER_BOUND', t);
