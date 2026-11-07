/** X81 — CHRONOS v2: length-tagged prefix markers (unambiguous in reverse) and an
 *  ADAPTIVE contract that pays only for the clause of each form actually present. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const RJ = (d: string) => (d.startsWith('0') ? ' ' + d.slice(1) : d);

type Form = { id: string; re: RegExp; rep: string; clause: string };
const FORMS: Form[] = [
  { id: 'd14', re: /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/g, rep: '~$1$2$3$4$5$6', clause: 'a ~ then 14 digits is YYYYMMDDHHMMSS' },
  { id: 'd12', re: /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?![\d:])/g, rep: '~$1$2$3$4$5', clause: 'a ~ then 12 digits is YYYYMMDDHHMM' },
  { id: 'd8', re: /(\d{4})-(\d{2})-(\d{2})/g, rep: '~$1$2$3', clause: 'a ~ then 8 digits is YYYYMMDD' },
  { id: 'c6', re: /(?<![\d:])(\d{2}):(\d{2}):(\d{2})(?![\d:])/g, rep: '^$1$2$3', clause: 'a ^ then 6 digits is HHMMSS' },
  { id: 'c4', re: /(?<![\d:])(\d{2}):(\d{2})(?![\d:])/g, rep: '^$1$2', clause: 'a ^ then 4 digits is HHMM' },
  { id: 'lst', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{2}):(\\d{2})`, 'g'), rep: '@$1$2$3:$4', clause: 'a @ then MonDDHH:MM is a month-day-time' },
  { id: 'lsy', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{4})(?![\\d:])`, 'g'), rep: '&$1$2!$3', clause: 'a & then MonDD!YYYY is a month-day-year' },
];
const pack = (S: string, use: Form[]) => use.reduce((a, f) => a.replace(new RegExp(f.re.source, 'g'), f.rep), S);
const unpack = (S: string) => S
  .replace(/~(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g, (_m, y, mo, d, h, mi, s) => `${y}-${mo}-${d} ${h}:${mi}:${s}`)
  .replace(/~(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g, (_m, y, mo, d, h, mi) => `${y}-${mo}-${d} ${h}:${mi}`)
  .replace(/~(\d{4})(\d{2})(\d{2})(?!\d)/g, (_m, y, mo, d) => `${y}-${mo}-${d}`)
  .replace(/\^(\d{2})(\d{2})(\d{2})(?!\d)/g, (_m, h, mi, s) => `${h}:${mi}:${s}`)
  .replace(/\^(\d{2})(\d{2})(?!\d)/g, (_m, h, mi) => `${h}:${mi}`)
  .replace(/@([A-Za-z]{3})(\d{2})(\d{2}:\d{2})/g, (_m, mo, d, t) => `${mo} ${RJ(d)} ${t}`)
  .replace(/&([A-Za-z]{3})(\d{2})!(\d{4})/g, (_m, mo, d, y) => `${mo} ${RJ(d)}  ${y}`);

const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  // G1 / G3: markers must be absent from the source, else the scheme is not total
  const used = FORMS.filter((f) => (S.match(new RegExp(f.re.source, 'g')) ?? []).length > 0);
  const marks = [...new Set(used.map((f) => f.rep[0]))];
  const clash = marks.filter((m) => S.includes(m));
  if (!used.length) { console.log(`${p.split('/').pop()!.padEnd(22)} sites 0`); continue; }
  if (clash.length) { console.log(`${p.split('/').pop()!.padEnd(22)} BLOCKED: source contains marker ${JSON.stringify(clash)}`); continue; }
  const T = pack(S, used);
  const rt = unpack(T) === S;
  const raw = countTokens(T, enc) - countTokens(S, enc);
  const contract = '§X81 times are packed: ' + used.map((f) => f.clause).join('; ') + '. In a month-day form the day is right-justified to width 2. Restore the punctuation.';
  const ct = countTokens(contract, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} forms ${used.map((f) => f.id).join(',').padEnd(15)} rt=${rt} raw ${String(raw).padStart(5)} contract ${ct}`);
  if (!rt) { console.log('   [-- BLOCKED rt --]'); continue; }
  const base: any = tagstackFrontier(S, enc);
  const f: any = tagstackFrontier(contract + '\n' + T, enc);
  const d = f.messageTokens - base.messageTokens;
  console.log(`   F ${base.messageTokens} -> ${f.messageTokens} (${d >= 0 ? '+' : ''}${d})`);
  rows.push({ lane: p.split('/').pop(), F: base.messageTokens, forms: used.map((f) => f.id), rt, raw, contract: ct, net: d });
}
fs.writeFileSync('bench/x81/receipts/chrono2.json', JSON.stringify(rows, null, 1) + '\n');
