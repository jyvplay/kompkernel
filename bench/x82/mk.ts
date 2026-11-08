/** X82 — ADAPTIVE MARKER ALPHABET.
 *  HARMOS refuses a lane if ANY of `% ~ & @ ^` occurs in the source, even when the shapes
 *  that lane needs use only one of them. ps-aux-real (frontier 1051, 308 headroom) is
 *  refused for containing `%` (the %CPU/%MEM headers) although clock packing needs only
 *  `^`. Fix: choose markers per shape from a candidate pool, using only collision-free
 *  ones, and refuse only when a NEEDED marker cannot be placed. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const POOL = ['^', '~', '&', '@', '%', '$', ';', '?', '!', '*', '=', '<', '>', '[', ']', '{', '}', '`', '+', '/'];
const RJ = (d: string) => (d.startsWith('0') ? ' ' + d.slice(1) : d);
const P2 = (d: string) => d.padStart(2, '0');

interface Sh { id: string; re: RegExp; rep: (m: string[], mk: string) => string; inv: (mk: string) => RegExp; out: (m: string[]) => string; terse: (mk: string) => string; }
const SHAPES: Sh[] = [
  { id: 'lsy', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{4})(?![\\d:])`, 'g'),
    rep: (m, k) => `${k}${m[1]}${P2(m[2])}!${m[3]}`, inv: (k) => new RegExp(`\\${k}([A-Za-z]{3})(\\d{2})!(\\d{4})`, 'g'),
    out: (m) => `${m[1]} ${RJ(m[2])}  ${m[3]}`, terse: (k) => `${k}MonDD!YYYY` },
  { id: 'lst', re: new RegExp(`(${MON}) +(\\d{1,2}) +(\\d{2}):(\\d{2})`, 'g'),
    rep: (m, k) => `${k}${m[1]}${P2(m[2])}${m[3]}:${m[4]}`, inv: (k) => new RegExp(`\\${k}([A-Za-z]{3})(\\d{2})(\\d{2}:\\d{2})`, 'g'),
    out: (m) => `${m[1]} ${RJ(m[2])} ${m[3]}`, terse: (k) => `${k}MonDDHH:MM` },
  { id: 'd8', re: /(\d{4})-(\d{2})-(\d{2})/g,
    rep: (m, k) => `${k}${m[1]}${m[2]}${m[3]}`, inv: (k) => new RegExp(`\\${k}(\\d{4})(\\d{2})(\\d{2})(?!\\d)`, 'g'),
    out: (m) => `${m[1]}-${m[2]}-${m[3]}`, terse: (k) => `${k}8=YYYYMMDD` },
  { id: 'c6', re: /(?<![\d:])(\d{2}):(\d{2}):(\d{2})(?![\d:])/g,
    rep: (m, k) => `${k}${m[1]}${m[2]}${m[3]}`, inv: (k) => new RegExp(`\\${k}(\\d{2})(\\d{2})(\\d{2})(?!\\d)`, 'g'),
    out: (m) => `${m[1]}:${m[2]}:${m[3]}`, terse: (k) => `${k}6=HHMMSS` },
  { id: 'c4', re: /(?<![\d:])(\d{2}):(\d{2})(?![\d:])/g,
    rep: (m, k) => `${k}${m[1]}${m[2]}`, inv: (k) => new RegExp(`\\${k}(\\d{2})(\\d{2})(?!\\d)`, 'g'),
    out: (m) => `${m[1]}:${m[2]}`, terse: (k) => `${k}4=HHMM` },
];
const out: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  // detect which shapes fire, sequentially
  let probe = S; const used: Sh[] = [];
  for (const sh of SHAPES) {
    const m = probe.match(new RegExp(sh.re.source, 'g'));
    if (!m || !m.length) continue;
    used.push(sh); probe = probe.replace(new RegExp(sh.re.source, 'g'), (...a: any[]) => sh.rep(a as string[], '\u0000'));
  }
  if (!used.length) { console.log(`${p.split('/').pop()!.padEnd(20)} no shapes`); continue; }
  // assign a collision-free marker to each used shape
  const taken = new Set<string>(); const mk: Record<string, string> = {};
  let ok = true;
  for (const sh of used) {
    const free = POOL.find(c => !S.includes(c) && !taken.has(c));
    if (!free) { ok = false; break; }
    mk[sh.id] = free; taken.add(free);
  }
  if (!ok) { console.log(`${p.split('/').pop()!.padEnd(20)} cannot place markers`); continue; }
  let T = S; for (const sh of used) T = T.replace(new RegExp(sh.re.source, 'g'), (...a: any[]) => sh.rep(a as string[], mk[sh.id]));
  let U = T; for (let i = used.length - 1; i >= 0; i--) U = U.replace(used[i].inv(mk[used[i].id]), (...a: any[]) => used[i].out(a as string[]));
  const rt = U === S;
  const C = `${used.map(sh => sh.terse(mk[sh.id])).join(' ')}.`;
  const ct = countTokens(C, enc);
  const base: any = tagstackFrontier(S, enc);
  const f: any = tagstackFrontier(C + '\n' + T, enc);
  const d = f.messageTokens - base.messageTokens;
  console.log(`${p.split('/').pop()!.padEnd(20)} [${used.map(s => s.id + '=' + mk[s.id]).join(' ')}] rt=${rt} contract ${String(ct).padStart(2)} => F ${base.messageTokens} -> ${f.messageTokens} (${d >= 0 ? '+' : ''}${d})   ${C}`);
  out.push({ lane: p.split('/').pop(), shapes: used.map(s => s.id), markers: used.map(s => mk[s.id]), rt, contract: ct, F: base.messageTokens, net: d, C });
}
fs.writeFileSync('/home/user/kompkernel/bench/x82/receipts/mk.json', JSON.stringify(out, null, 1) + '\n');
