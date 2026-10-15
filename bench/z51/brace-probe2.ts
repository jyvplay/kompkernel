import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
import { braceTree } from './brace-lib';
const enc = 'o200k_base' as const;
const SENT = 'Brace groups work as in bash: text before { joins each comma item, in order; groups nest. Print one path per line.';
for (const f of process.argv.slice(2)) {
  const paths = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => l.trim().split(/\s+/).pop()!);
  const plain = paths.join('\n');
  const bt = braceTree(paths).join('\n');
  const dp = daedalusEncode(plain, enc, {});
  const db = daedalusEncode(bt, enc, {});
  const sentT = countTokens(SENT, enc);
  console.log(JSON.stringify({ f, n: paths.length, rawPlain: dp.inTokens, M_plain: dp.messageTokens, M_brace_body: db.messageTokens, sentTok: sentT, M_brace_total: db.messageTokens + sentT, net: db.messageTokens + sentT - dp.messageTokens, exact: db.decoded === bt }));
}
