/** X81 — ISO date packing: `2026-11-07` -> `20261107`. Reverse is unambiguous
 *  iff the source contains no pre-existing bare 8-digit run (G1). */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const DAY = /(\d{4})-(\d{2})-(\d{2})/g;
const RUN8 = /(?<!\d)\d{8}(?!\d)/g;
const pack = (S: string) => S.replace(DAY, '$1$2$3');
const unpack = (S: string) => S.replace(RUN8, (m) => `${m.slice(0, 4)}-${m.slice(4, 6)}-${m.slice(6)}`);
const CONTRACT = '§X81 dates are packed: every bare 8-digit run is YYYYMMDD, restore the two hyphens.';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = (S.match(DAY) ?? []).length, g1 = (S.match(RUN8) ?? []).length;
  if (n === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} | dates 0`); continue; }
  const T = pack(S);
  const rt = unpack(T) === S;
  console.log(`${p.split('/').pop()!.padEnd(22)} dates ${String(n).padStart(3)} pre8=${g1} rt=${rt} raw ${countTokens(T, enc) - countTokens(S, enc)}`);
  if (!rt || g1 > 0) { console.log('   [-- BLOCKED: round trip or G1 --]'); continue; }
  const base: any = tagstackFrontier(S, enc);
  const f: any = tagstackFrontier(CONTRACT + '\n' + T, enc);
  const d = f.messageTokens - base.messageTokens;
  console.log(`   F ${base.messageTokens} -> ${f.messageTokens} (${d >= 0 ? '+' : ''}${d})   contract ${countTokens(CONTRACT, enc)}`);
  rows.push({ lane: p.split('/').pop(), F: base.messageTokens, n, rt, raw: countTokens(T, enc) - countTokens(S, enc), net: d });
}
fs.writeFileSync('bench/x81/receipts/iso.json', JSON.stringify(rows, null, 1) + '\n');
