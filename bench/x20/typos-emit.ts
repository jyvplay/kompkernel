/** X20: emit the one-chat TYPOS messages (and the expected plaintext) for the CPython cross-check. */
import fs from 'node:fs';
import { typosEncode } from '@/lib/omega/typos';
const msgs: string[] = []; const exp: string[] = []; const meta: any[] = [];
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = typosEncode(text);
  if (!r.transformed) continue;
  msgs.push(r.message); exp.push(text);
  meta.push({ lane: f, rule: r.rule, chained: r.chained, shapes: r.shapes, marks: r.marks, M: r.messageTokens.o200k_base, base: r.baseTokens.o200k_base });
}
fs.writeFileSync('bench/x20/receipts/typos-messages.json', JSON.stringify(msgs));
fs.writeFileSync('bench/x20/receipts/typos-expected.json', JSON.stringify(exp));
fs.writeFileSync('bench/x20/receipts/typos-meta.json', JSON.stringify(meta, null, 1));
console.log(`emitted ${msgs.length} transformed messages`);
