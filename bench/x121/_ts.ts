import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const rows = fs.readFileSync('bench/x120/receipts/ab-messages.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
for (const r of rows) {
  if (!/ls-l-real|ps-aux-real/.test(r['path'])) continue;
  const m: string = r['message'];
  const s=m.indexOf('§'), p=m.indexOf('¶',s+1);
  const tape=m.slice(s+1,p);
  const toks = tokenStrings(tape, 'o200k_base');
  console.log('###', r['path'], 'tapeTokens', toks.length);
  console.log(JSON.stringify(toks.slice(0,150)));
  console.log();
}
