import * as fs from 'node:fs';
import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
let bad = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires')) {
  const m = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const a = countTokens(m, enc), b = countTokensExact(m, enc);
  if (a !== b) { bad++; console.log(`MISMATCH ${f}: countTokens=${a} exact=${b}`); }
}
console.log(`messages checked: 10, mismatches: ${bad}`);
