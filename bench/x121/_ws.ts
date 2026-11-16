import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
const rows = fs.readFileSync('bench/x120/receipts/ab-messages.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
let T=0, W=0, D=0;
for (const r of rows) {
  const toks = tokenStrings(r.message as string, 'o200k_base');
  let ws=0, wch=0, dig=0;
  for (const t of toks) { if (t.s.trim()==='' && t.s.length>0) { ws++; wch+=t.s.length; } if (/^\d+$/.test(t.s)) dig++; }
  T+=toks.length; W+=ws; D+=dig;
  console.log(`${r.path.split('/').slice(-1)[0].padEnd(24)} tok=${String(toks.length).padStart(4)} wsTok=${String(ws).padStart(4)} wsChars=${String(wch).padStart(5)} digitTok=${String(dig).padStart(4)}`);
}
console.log('TOTAL tokens', T, 'whitespace-only tokens', W, 'pure-digit tokens', D);
