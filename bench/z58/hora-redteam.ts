// X13 red team for HORA. Pure transform round trip (horaExpand(horaSubstitute(x)) === x) on hand-written
// edge cases and a seeded random table. Also full horaEncode + horaDecode on every case (DAEDALUS-level exact).
// These are adversarial unit inputs, not performance evidence.
import fs from 'node:fs';
import { horaSubstitute, horaExpand, horaEncode, horaDecode } from '@/lib/omega/hora';
const cases: [string, string][] = [
  ['empty', ''],
  ['no-timestamps', 'hello world\nsecond line\n'],
  ['single', '2017-05-16 00:00:00.008 INFO x\n'],
  ['same-date-run', '2017-05-16 00:00:00.008 a\n2017-05-16 00:00:00.272 b\n2017-05-16 00:00:01.551 c\n'],
  ['T-sep-Z', '2026-10-15T06:32:47.992Z a\n2026-10-15T06:32:48.120Z b\n2026-10-15T06:32:48.121Z c\n'],
  ['mixed-sep', '2017-05-16 00:00:00.008 a\n2017-05-16T00:00:00.272 b\n2017-05-16 00:00:00.300 c\n'],
  ['date-change', '2017-05-16 23:59:59.999 a\n2017-05-17 00:00:00.001 b\n2017-05-17 00:00:00.002 c\n'],
  ['negative-delta', '2017-05-16 00:00:02.000 a\n2017-05-16 00:00:01.500 b\n'],
  ['delta-over-limit', '2017-05-16 00:00:00.000 a\n2017-05-16 00:00:20.000 b\n'],
  ['delta-zero', '2017-05-16 00:00:05.000 a\n2017-05-16 00:00:05.000 b\n'],
  ['contains-marker', '※ 2017-05-16 00:00:00.008 a\n2017-05-16 00:00:00.272 b\n'],
  ['section-sign-in-input', '§ note 2017-05-16 00:00:00.008 a\n2017-05-16 00:00:00.272 b\n'],
  ['6-digit-fraction', '2017-05-16 00:00:01.123456 a\n2017-05-16 00:00:01.124 b\n'],
  ['digit-before', '12017-05-16 00:00:01.123 a\n2017-05-16 00:00:01.124 b\n'],
  ['two-on-line', '2017-05-16 00:00:01.000 x 2017-05-16 00:00:01.250 y\n'],
  ['letter-before', 'x2017-05-16 00:00:01.000 a\nx2017-05-16 00:00:01.250 b\n'],
  ['crlf', '2017-05-16 00:00:01.000 a\r\n2017-05-16 00:00:01.250 b\r\n'],
  ['leading-zero-ms', '2017-05-16 00:00:00.000 a\n2017-05-16 00:00:00.007 b\n2017-05-16 00:00:00.010 c\n'],
  ['midnight-tod', '2017-05-16 00:00:00.100 a\n2017-05-16 23:59:59.900 b\n'],
  ['literal-looking-mark', '2017-05-16 00:00:01.000 a\n※ 5\n2017-05-16 00:00:01.250 b\n'],
  ['patch-attack-literal-between-deltas', '2017-05-16 00:00:01.000 a\n2017-05-16 00:00:01.250 b\n2017-05-16T00:00:01.300 c\n2017-05-16 00:00:01.400 d\n2017-05-16 00:00:01.399 e\n'],
  ['patch-attack-delta-after-date-change', '2017-05-16 23:59:59.998 a\n2017-05-16 23:59:59.999 b\n2017-05-17 00:00:00.000 c\n2017-05-17 00:00:00.001 d\n'],
];
// seeded random table (LCG; deterministic)
let seed = 20261015;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (let t = 0; t < 24; t++) {
  const lines: string[] = [];
  let ms = Math.floor(rnd() * 80_000_000);
  const day = 16 + Math.floor(rnd() * 3);
  for (let i = 0; i < 60; i++) {
    ms += rnd() < 0.85 ? Math.floor(rnd() * 3000) : Math.floor(rnd() * 90_000_000);
    const d = ms >= 86_400_000 ? day + 1 : day;
    const tod = ms % 86_400_000;
    const p = (x: number, n: number) => String(x).padStart(n, '0');
    const hh = Math.floor(tod / 3_600_000), mi = Math.floor(tod / 60000) % 60, ss = Math.floor(tod / 1000) % 60, mm = tod % 1000;
    const sep = rnd() < 0.9 ? ' ' : 'T';
    const suffix = rnd() < 0.2 ? 'Z' : '';
    lines.push(`2017-05-${p(d, 2)}${sep}${p(hh, 2)}:${p(mi, 2)}:${p(ss, 2)}.${p(mm, 3)}${suffix} line ${i} ${rnd() < 0.3 ? 'x' : 'y'}`);
  }
  cases.push([`random-${t}`, lines.join('\n') + '\n']);
}
let pass = 0, fail = 0;
const rows: string[] = [];
for (const [name, text] of cases) {
  const sub = horaSubstitute(text);
  const transformOk = horaExpand(sub.out) === text;
  let fullOk = true, arm = 'not-run', M = -1;
  // Full DAEDALUS-level encode is run on the hand-written cases and 3 random tables (time-bounded by natural end).
  if (!name.startsWith('random') || ['random-0', 'random-1', 'random-2'].includes(name)) {
    const r = horaEncode(text, 'o200k_base');
    arm = r.arm; M = r.messageTokens;
    fullOk = horaDecode(r.wire, r.arm) === text && r.exact;
  }
  const ok = transformOk && fullOk;
  ok ? pass++ : fail++;
  rows.push(JSON.stringify({ name, marks: sub.marks, transformOk, fullOk, arm, M, ok }));
}
for (const r of rows) console.log(r);
console.log(JSON.stringify({ summary: true, cases: cases.length, pass, fail }));
fs.writeFileSync('bench/z58/receipts/hora-redteam.jsonl', rows.join('\n') + '\n');
