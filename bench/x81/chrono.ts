/** X81 — CHRONOS: one contract, all temporal forms. Contract cost is amortised
 *  across ls-dates, clocks and ISO dates, so lanes using any subset still pay once. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
// order matters: longest / most specific first
const RULES: [string, RegExp, string][] = [
  ['iso-dt', /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/g, '$1$2$3$4$5$6'],
  ['iso-dt', /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?![\d:])/g, '$1$2$3$4$5'],
  ['iso-day', /(\d{4})-(\d{2})-(\d{2})/g, '$1$2$3'],
  ['ls-time', new RegExp(`(${MON})\\s+(\\d{1,2})\\s+(\\d{2}):(\\d{2})`, 'g'), '@$1$2$3:$4'],
  ['ls-year', new RegExp(`(${MON})\\s+(\\d{1,2})\\s+(\\d{4})(?!:)`, 'g'), '@$1$2!$3'],
  ['clock', /(\d{2}):(\d{2}):(\d{2})/g, '$1$2$3'],
  ['hhmm', /(\d{2}):(\d{2})(?![\d:])/g, '$1$2'],
];
const INV: [RegExp, (...a: string[]) => string][] = [
  [/@([A-Z][a-z]{2})(\d{1,2})!(\d{4})/g, (_m, mo, d, y) => `${mo} ${d.startsWith('0') ? ' ' + d.slice(1) : d}  ${y}`],
  [/@([A-Z][a-z]{2})(\d{1,2})(\d{2}:\d{2})/g, (_m, mo, d, t) => `${mo} ${d.startsWith('0') ? ' ' + d.slice(1) : d} ${t}`],
  [/(?<!\d)(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g, (_m, y, mo, d, h, mi, s) => `${y}-${mo}-${d} ${h}:${mi}:${s}`],
  [/(?<!\d)(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g, (_m, y, mo, d, h, mi) => `${y}-${mo}-${d} ${h}:${mi}`],
  [/(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/g, (_m, y, mo, d) => `${y}-${mo}-${d}`],
  [/(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/g, (_m, h, mi, s) => `${h}:${mi}:${s}`],
  [/(?<!\d)(\d{2})(\d{2})(?!\d)/g, (_m, h, mi) => `${h}:${mi}`],
];
const pack = (S: string) => RULES.reduce((a, [, re, rep]) => a.replace(new RegExp(re.source, 'g'), rep), S);
const unpack = (S: string) => INV.reduce((a, [re, f]) => a.replace(new RegExp(re.source, 'g'), f as any), S);
const CONTRACT = '§X81 times are packed: a bare 4-digit run is HHMM, 6-digit is HHMMSS, 8-digit is YYYYMMDD, 12 is YYYYMMDDHHMM, 14 is YYYYMMDDHHMMSS; restore the colons and hyphens. @MonDD!YYYY is a month-day-year, @MonDDHH:MM a month-day-time; the day is right-justified to width 2.';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const n = RULES.reduce((a, [, re]) => a + (S.match(new RegExp(re.source, 'g')) ?? []).length, 0);
  if (n === 0) { console.log(`${p.split('/').pop()!.padEnd(22)} sites 0`); continue; }
  const T = pack(S);
  const rt = unpack(T) === S;
  const raw = countTokens(T, enc) - countTokens(S, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} sites ${String(n).padStart(3)} rt=${rt} raw ${raw}`);
  if (!rt) { console.log('   [-- BLOCKED rt --]'); continue; }
  const base: any = tagstackFrontier(S, enc);
  const f: any = tagstackFrontier(CONTRACT + '\n' + T, enc);
  const d = f.messageTokens - base.messageTokens;
  console.log(`   F ${base.messageTokens} -> ${f.messageTokens} (${d >= 0 ? '+' : ''}${d})   contract ${countTokens(CONTRACT, enc)}`);
  rows.push({ lane: p.split('/').pop(), F: base.messageTokens, n, rt, raw, net: d });
}
fs.writeFileSync('bench/x81/receipts/chrono.json', JSON.stringify(rows, null, 1) + '\n');
