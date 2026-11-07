/** X81 — date packing, with the day's right-justification DERIVED from its value
 *  (ls -l right-justifies the day to width 2, so `Jan  2` has two spaces and `Jan 15` one). */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const RE_T = new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{2}):(\\d{2})\\b`, 'g');
const RE_Y = new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{4})\\b`, 'g');
const CONTRACTS: [string, string][] = [
  ['long', '§X81 in a date the spaces are gone: a 3-letter month, then 2 digits of day (zero-padded), then HH:MM or a 4-digit year. Restore the spaces: the day is right-justified to width 2, one space before HH:MM, two before a year.'],
  ['short', '§X81 dates are packed: MMM+DD+HH:MM or MMM+DD+YYYY, no spaces. Restore: day right-justified to 2, 1 space before HH:MM, 2 before YYYY.'],
  ['tiny', '§X81 dates packed MMMDDHH:MM / MMMDDYYYY; restore spaces (day right-just 2, 1 before time, 2 before year).'],
];
const pack = (S: string) => S
  .replace(new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{2}):(\\d{2})\\b`, 'g'),
    (_m, mo: string, d: string, h: string, mi: string) => `${mo}${d.padStart(2, '0')}${h}:${mi}`)
  .replace(new RegExp(`\\b(${MON})\\s+(\\d{1,2})\\s+(\\d{4})\\b`, 'g'),
    (_m, mo: string, d: string, y: string) => `${mo}${d.padStart(2, '0')}${y}`);
const unpack = (S: string) => S
  .replace(new RegExp(`\\b(${MON})(\\d{2})(\\d{2}):(\\d{2})\\b`, 'g'),
    (_m, mo: string, d: string, h: string, mi: string) => {
      const dd = d.startsWith('0') ? ' ' + d.slice(1) : d; return `${mo} ${dd} ${h}:${mi}`;
    })
  .replace(new RegExp(`\\b(${MON})(\\d{2})(\\d{4})\\b`, 'g'),
    (_m, mo: string, d: string, y: string) => {
      const dd = d.startsWith('0') ? ' ' + d.slice(1) : d; return `${mo} ${dd}  ${y}`;
    });
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = (S.match(RE_T) ?? []).length + (S.match(RE_Y) ?? []).length;
  const base: any = tagstackFrontier(S, enc);
  if (n === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(5)} | dates 0`); continue; }
  const T = pack(S);
  const rt = unpack(T) === S;
  rows.push({ lane: p.split('/').pop(), F: base.messageTokens, n, rt });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(5)} | dates ${String(n).padStart(4)} rt=${rt} raw ${countTokens(T, enc) - countTokens(S, enc)}`);
  if (!rt) { console.log('   [-- skipping frontier: round trip fails --]'); continue; }
  for (const [name, C] of CONTRACTS) {
    const f: any = tagstackFrontier(C + '\n' + T, enc);
    const d = f.messageTokens - base.messageTokens;
    console.log(`   contract[${name}] ${String(countTokens(C, enc)).padStart(3)} tok => ${d >= 0 ? '+' : ''}${d}`);
    rows[rows.length - 1][name] = d;
  }
}
fs.writeFileSync('bench/x81/receipts/date2.json', JSON.stringify(rows, null, 1) + '\n');
