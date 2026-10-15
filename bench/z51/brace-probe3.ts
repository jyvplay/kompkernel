import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
import { braceTree } from './brace-lib';
const enc = 'o200k_base' as const;
const SENT = 'Brace groups work as in bash: text before { joins each comma item, in order; groups nest. Print one line per item.';
for (const f of process.argv.slice(2)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
  const plain = lines.join('\n');
  const bt = braceTree(lines).join('\n');
  const dp = daedalusEncode(plain, enc, {});
  const db = daedalusEncode(bt, enc, {});
  const sentT = countTokens(SENT, enc);
  console.log(JSON.stringify({ f, n: lines.length, rawPlain: dp.inTokens, M_plain: dp.messageTokens, M_brace_body: db.messageTokens, sentTok: sentT, net: db.messageTokens + sentT - dp.messageTokens, exact: db.decoded === bt }));
}
