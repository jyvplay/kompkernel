/** X81 — Unix-style date-time field packing.
 *  `Jan  2 08:00` -> `Jan0208:00` (MMM DD HH:MM, 10 chars)
 *  `Apr 14  2017` -> `Apr142017`  (MMM DD YYYY,  9 chars)
 *  Day is zero-padded to 2, so both forms are FIXED WIDTH and the reader can split them.
 *  The two forms differ by length and by the presence of the colon, so they never collide. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const CONTRACT = '§X81 after a 3-letter month name: 2 digits are the day, then either HH:MM or a 4-digit year. All spaces in the date are gone.';
const pack = (S: string) => S
  .replace(new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{2}):(\\d{2})\\b`, 'g'),
    (_m, mo: string, d: string, h: string, mi: string) => `${mo}${d.padStart(2, '0')}${h}:${mi}`)
  .replace(new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{4})\\b`, 'g'),
    (_m, mo: string, d: string, y: string) => `${mo}${d.padStart(2, '0')}${y}`);
const unpack = (S: string) => S
  .replace(new RegExp(`\\b(${MON})(\\d{2})(\\d{2}):(\\d{2})\\b`, 'g'), '$1 $2 $3:$4')
  .replace(new RegExp(`\\b(${MON})(\\d{2})(\\d{4})\\b`, 'g'), '$1 $2  $3');
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n1 = (S.match(new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{2}):(\\d{2})\\b`, 'g')) ?? []).length;
  const n2 = (S.match(new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{4})\\b`, 'g')) ?? []).length;
  const n = n1 + n2;
  const base: any = tagstackFrontier(S, enc);
  if (n === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(5)} | dates 0`); continue; }
  const T = pack(S);
  const rt = unpack(T) === S;
  const rawD = countTokens(T, enc) - countTokens(S, enc);
  const f: any = tagstackFrontier(CONTRACT + '\n' + T, enc);
  const d = f.messageTokens - base.messageTokens;
  rows.push({ lane: p.split('/').pop(), F: base.messageTokens, n, rt, rawD, ct: countTokens(CONTRACT, enc), d });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(5)} | dates ${String(n).padStart(4)} rt=${rt} raw ${String(rawD).padStart(5)} contract ${countTokens(CONTRACT, enc)} => ${d >= 0 ? '+' : ''}${d}`);
}
fs.writeFileSync('bench/x81/receipts/date.json', JSON.stringify(rows, null, 1) + '\n');
