/** X80 — where does the frontier's token budget actually go? */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const out: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(text, enc);
  const ts = tokenStrings(r.message, enc);
  let nl = 0, ws = 0, dig = 0, let_ = 0, punct = 0, mix = 0;
  for (const { s } of ts) {
    if (/^\s*$/.test(s)) { if (s.includes('\n')) nl++; else ws++; }
    else if (/^[0-9]+$/.test(s)) dig++;
    else if (/^[^\s\p{L}\p{N}]+$/u.test(s)) punct++;
    else if (/^\p{L}+$/u.test(s)) let_++;
    else mix++;
  }
  const T = ts.length;
  out.push({ lane: p.split('/').pop(), raw: countTokens(text, enc), F: T, nl, ws, dig, let: let_, punct, mix });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(T).padStart(5)} | NL ${String(nl).padStart(4)} ws ${String(ws).padStart(3)} punct ${String(punct).padStart(4)} digit ${String(dig).padStart(4)} letter ${String(let_).padStart(4)} mix ${String(mix).padStart(4)}`);
}
fs.writeFileSync('bench/x80/receipts/budget.json', JSON.stringify(out, null, 1) + '\n');
