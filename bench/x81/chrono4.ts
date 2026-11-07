/** X81 — CHRONOS v3. Forms are applied SEQUENTIALLY, each on the output of the last,
 *  and unpack applies the inverses in EXACT REVERSE ORDER. Length-tagged markers make
 *  every inverse unambiguous. Contract is adaptive: only clauses for forms that fired. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const P2 = (d: string) => d.padStart(2, '0');
const RJ = (d: string) => (d.startsWith('0') ? ' ' + d.slice(1) : d);

type F = { id: string; re: RegExp; rep: (m: string[]) => string; inv: RegExp; out: (m: string[]) => string; clause: string; terse: string };
const F: F[] = [
  { id: 'dt14T', re: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/g,
    rep: m => `%${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}`, inv: /%(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g,
    out: m => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`, clause: 'a % then 14 digits is YYYYMMDDHHMMSS with T', terse: '%14=YYYYMMDDTHHMMSS' },
  { id: 'dt14S', re: /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/g,
    rep: m => `~${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}`, inv: /~(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/g,
    out: m => `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`, clause: 'a ~ then 14 digits is YYYYMMDDHHMMSS', terse: '~14d=ISO+time' },
  { id: 'dt12T', re: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?![\d:])/g,
    rep: m => `%${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`, inv: /%(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g,
    out: m => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, clause: 'a % then 12 digits is YYYYMMDDHHMM with T', terse: '%12d=ISO T+hm' },
  { id: 'dt12S', re: /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?![\d:])/g,
    rep: m => `~${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`, inv: /~(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(?!\d)/g,
    out: m => `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`, clause: 'a ~ then 12 digits is YYYYMMDDHHMM', terse: '~12d=ISO+hm' },
  { id: 'lsy', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{4})(?![\\d:])`, 'g'),
    rep: m => `&${m[1]}${P2(m[2])}!${m[3]}`, inv: /&([A-Za-z]{3})(\d{2})!(\d{4})/g,
    out: m => `${m[1]} ${RJ(m[2])}  ${m[3]}`, clause: 'a & then MonDD!YYYY is a month-day-year', terse: '&MonDD!YYYY' },
  { id: 'lst', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{2}):(\\d{2})`, 'g'),
    rep: m => `@${m[1]}${P2(m[2])}${m[3]}:${m[4]}`, inv: /@([A-Za-z]{3})(\d{2})(\d{2}:\d{2})/g,
    out: m => `${m[1]} ${RJ(m[2])} ${m[3]}`, clause: 'a @ then MonDDHH:MM is a month-day-time', terse: '@MonDDHH:MM' },
  { id: 'd8', re: /(\d{4})-(\d{2})-(\d{2})/g,
    rep: m => `~${m[1]}${m[2]}${m[3]}`, inv: /~(\d{4})(\d{2})(\d{2})(?!\d)/g,
    out: m => `${m[1]}-${m[2]}-${m[3]}`, clause: 'a ~ then 8 digits is YYYYMMDD', terse: '~8d=ISO' },
  { id: 'c6', re: /(?<![\d:])(\d{2}):(\d{2}):(\d{2})(?![\d:])/g,
    rep: m => `^${m[1]}${m[2]}${m[3]}`, inv: /\^(\d{2})(\d{2})(\d{2})(?!\d)/g,
    out: m => `${m[1]}:${m[2]}:${m[3]}`, clause: 'a ^ then 6 digits is HHMMSS', terse: '^6d=HH:MM:SS' },
  { id: 'c4', re: /(?<![\d:])(\d{2}):(\d{2})(?![\d:])/g,
    rep: m => `^${m[1]}${m[2]}`, inv: /\^(\d{2})(\d{2})(?!\d)/g,
    out: m => `${m[1]}:${m[2]}`, clause: 'a ^ then 4 digits is HHMM', terse: '^4d=HH:MM' },
];
function packAll(S: string) {
  let T = S; const used: F[] = []; const counts: Record<string, number> = {};
  for (const f of F) {
    const m = T.match(new RegExp(f.re.source, 'g'));
    if (!m || !m.length) continue;
    counts[f.id] = m.length; used.push(f);
    T = T.replace(new RegExp(f.re.source, 'g'), (...a: any[]) => f.rep(a as string[]));
  }
  return { T, used, counts };
}
function unpackAll(T: string, used: F[]) {
  let S = T;
  for (let i = used.length - 1; i >= 0; i--) S = S.replace(new RegExp(used[i].inv.source, 'g'), (...a: any[]) => used[i].out(a as string[]));
  return S;
}
const mkContract = (used: F[], terse: boolean) => {
  if (!terse) return '§X81 times are packed: ' + used.map(f => f.clause).join('; ')
    + '. A day is right-justified to width 2. Restore the punctuation.';
  const parts = used.map(f => f.terse);
  if (used.some(f => f.id === 'lsy' || f.id === 'lst')) parts.push('day right-just 2');
  return '§X81 ' + parts.join(' ') + '.';
};
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const { T, used, counts } = packAll(S);
  if (!used.length) { console.log(`${p.split('/').pop()!.padEnd(22)} sites 0`); continue; }
  const marks = [...new Set(used.map(f => f.rep(['', '1', '1', '1', '1', '1', '1'])[0]))];
  const clash = marks.filter(m => S.includes(m));
  const rt = unpackAll(T, used) === S;
  const raw = countTokens(T, enc) - countTokens(S, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} [${used.map(f => `${f.id}:${counts[f.id]}`).join(' ')}] rt=${rt} raw ${String(raw).padStart(5)}`);
  if (clash.length) { console.log(`   [-- BLOCKED: source has marker ${JSON.stringify(clash)} --]`); continue; }
  if (!rt) { console.log('   [-- BLOCKED rt --]'); continue; }
  const base: any = tagstackFrontier(S, enc);
  const row: any = { lane: p.split('/').pop(), F: base.messageTokens, counts, rt, raw };
  for (const terse of [false, true]) {
    const C = mkContract(used, terse);
    const ct = countTokens(C, enc);
    const f: any = tagstackFrontier(C + '\n' + T, enc);
    const d = f.messageTokens - base.messageTokens;
    console.log(`   contract[${terse ? 'terse' : 'full '}] ${String(ct).padStart(3)} tok => ${d >= 0 ? '+' : ''}${d}`);
    row[terse ? 'netTerse' : 'netFull'] = d; row[terse ? 'cTerse' : 'cFull'] = ct;
  }
  rows.push(row);
}
fs.writeFileSync('bench/x81/receipts/chrono4.json', JSON.stringify(rows, null, 1) + '\n');
