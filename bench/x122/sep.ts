import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
let allOK = true;
for (const [p, m] of msgs) {
  const s0 = m.indexOf(CHIRON_START), p0 = m.indexOf(CHIRON_SEP, s0 + 1);
  if (s0 < 0 || p0 < 0) continue;
  const framed = m.slice(s0, p0 + 1);            // § tape ¶
  const body = m.slice(p0 + 1);
  const a = countTokens(framed + body, enc), b = countTokens(framed, enc) + countTokens(body, enc);
  const fromStart = m.slice(s0);
  const c = countTokens(fromStart, enc), d = countTokens(framed, enc) + countTokens(body, enc);
  if (c !== d) allOK = false;
  console.log(`${p.split('/').pop()!.padEnd(22)} §tape¶+body ${a} vs sum ${b} | from§ ${c} vs sum ${d} ${c === d ? 'OK' : 'DIFFER'}`);
}
console.log('all separable:', allOK);
