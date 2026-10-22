// X14: HEMERA red team. Transform-level exactness on every case (both arms), full encoder +
// reader (DAEDALUS round trip, G0-G4) on the hand cases and random-0..2. Also checks the
// invariant M(hemera) <= M(identity) on every full encode that was run.
import { hemeraSubstitute, hemeraExpand, hemeraEncode, hemeraDecode, HEMERA_MARK } from '@/lib/omega/hemera';
import { daedalusEncode } from '@/lib/omega/daedalus';

const hand: [string, string][] = [
  ['empty', ''],
  ['steps-1-3-3', '2014-01-02\n2014-01-03\n2014-01-06\n'],
  ['leap-day', '2016-02-28\n2016-02-29\n2016-03-01\n'],
  ['year-boundary', '1999-12-31\n2000-01-01\n'],
  ['century-nonleap', '2100-02-28\n2100-03-01\n'],
  ['leap-2000', '2000-02-28\n2000-02-29\n2000-03-01\n'],
  ['year-0000', '0000-01-01\n0001-01-01\n0002-01-01\n'],
  ['invalid-feb30', '2014-02-30\n2014-03-02\n2014-03-03\n'],
  ['negative-steps', '2014-01-10\n2014-01-03\n2013-12-31\n'],
  ['step-31', '2014-01-01\n2014-02-01\n2014-02-02\n'],
  ['step-32', '2014-01-01\n2014-02-02\n2014-02-03\n'],
  ['large-step', '2014-01-01\n2014-06-01\n2014-06-02\n'],
  ['datetime-no-ms', '2014-01-02 10:00:00\n2014-01-03 10:00:00\n2014-01-04 10:00:00\n'],
  ['ms-same-day', '2014-01-02 10:00:00.100\n2014-01-02 10:00:00.250\n2014-01-02 10:00:01.000\n'],
  ['ms-T-sep', '2014-01-02T10:00:00.100\n2014-01-02 10:00:00.250\n2014-01-02T10:00:00.300\n'],
  ['frac-6-digits', '2014-01-02 10:00:00.100000\n2014-01-03 10:00:00.100000\n'],
  ['frac-4-digits', '2014-01-02 10:00:00.1234\n2014-01-03 10:00:00.1235\n2014-01-03 10:00:00.1236\n'],
  ['timezone-Z', '2014-01-02T10:00:00.100Z\n2014-01-03T10:00:00.100Z\n2014-01-04T10:00:00.100Z\n'],
  ['marker-in-input', '※ 2014-01-02\n2014-01-03\n2014-01-04\n'],
  ['section-sign', '§ 2014-01-02\n2014-01-03\n2014-01-04\n'],
  ['adjacent-digit', '12014-01-02\n2014-01-03\n2014-01-04\n'],
  ['time-out-of-range', '2014-01-02 25:00:00.000\n2014-01-03 10:00:00.000\n2014-01-04 10:00:00.000\n'],
  ['two-on-one-line', '2014-01-02 10:00:00.000 2014-01-03 10:00:00.000 2014-01-04 10:00:00.000'],
  ['midnight-cross', '2014-01-02 23:59:59.999\n2014-01-03 00:00:00.001\n2014-01-04 00:00:00.002\n'],
  ['ms-over-max', '2014-01-02 00:00:00.000\n2014-01-02 01:00:00.000\n2014-01-03 01:00:00.000\n'],
  ['sep-changed', '2014-01-02 10:00:00.000\n2014-01-02T10:00:00.500\n2014-01-02T10:00:01.000\n'],
  ['non-canonical', '2014-1-02\n2014-01-03\n2014-01-04\n'],
  ['same-date-repeat', '2014-01-02\n2014-01-02\n2014-01-02\n'],
  ['no-seconds', '2014-01-02 10:00\n2014-01-03 10:00\n2014-01-04 10:00\n'],
  ['no-trailing-newline', '2014-01-02 10:00:00.000\n2014-01-03 10:00:00.000'],
  ['date-then-words', 'Released 2014-01-02, patched 2014-01-05 and 2014-01-09.\n'],
  ['date-then-ms-same-day', '2014-01-02 10:00:00.000 a\n2014-01-02 10:00:00.002 b\n2014-01-03 10:00:00.002 c\n'],
  // attacks on the two-state patch (X14 repair): date-only tokens between full timestamps
  ['patch-filename-date-between', 'log.2014-01-02_10:00:00 2014-01-02 10:00:00.000 x\nlog.2014-01-02_10:00:01 2014-01-02 10:00:00.250 x\nlog.2014-01-03_10:00:01 2014-01-02 10:00:00.500 x\n'],
  ['patch-day-then-ms', '2014-01-02 10:00:00.000\n2014-01-03 10:00:00.010\n2014-01-03 10:00:00.020\n2014-01-04 10:00:00.020\n'],
  ['patch-ms-after-date-only', '2014-01-02 10:00:00.000\n2014-01-02\n2014-01-02 10:00:00.100\n2014-01-03 10:00:00.200\n'],
];

// Seeded random tables: random-walk day steps (mostly small, some large), random time shapes,
// occasional invalid dates and year-0000 dates.
let seed = 20261015;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
function fmtZ(z: number): string {
  // inline civil_from_days (independent of the module under test is not required here; we only need strings)
  const d = new Date(Date.UTC(2000, 0, 1) + (z - 10957) * 86_400_000);
  const p = (x: number, n: number) => String(x).padStart(n, '0');
  return `${p(d.getUTCFullYear(), 4)}-${p(d.getUTCMonth() + 1, 2)}-${p(d.getUTCDate(), 2)}`;
}
const rand: [string, string][] = [];
for (let t = 0; t < 24; t++) {
  const lines: string[] = [];
  let z = 10957 + Math.floor(rnd() * 9000);
  const n = 30 + Math.floor(rnd() * 50);
  for (let i = 0; i < n; i++) {
    const r = rnd();
    const step = r < 0.6 ? 1 + Math.floor(rnd() * 3) : r < 0.9 ? Math.floor(rnd() * 60) - 30 : Math.floor(rnd() * 4000) - 2000;
    z += step;
    let ds = fmtZ(z);
    if (rnd() < 0.03) ds = pick(['2014-02-30', '0000-01-01', '2014-13-01', '2015-02-29']);
    const shape = rnd();
    if (shape < 0.35) lines.push(ds);
    else if (shape < 0.5) lines.push(`${ds} ${pick(['10:00', '23:59:59', '00:00:00'])}`);
    else {
      const h = Math.floor(rnd() * 24), m = Math.floor(rnd() * 60), s = Math.floor(rnd() * 60), ms = Math.floor(rnd() * 1000);
      const p = (x: number, k: number) => String(x).padStart(k, '0');
      lines.push(`${ds}${pick([' ', 'T'])}${p(h, 2)}:${p(m, 2)}:${p(s, 2)}.${p(ms, 3)}${pick(['', '', 'Z'])}`);
    }
  }
  rand.push([`random-${t}`, lines.join('\n') + '\n']);
}

const cases = [...hand, ...rand];
let pass = 0, fail = 0;
const out: string[] = [];
cases.forEach(([name, text], idx) => {
  const errs: string[] = [];
  // Transform level, both arms
  for (const flags of [{ day: true, ms: false }, { day: false, ms: true }, { day: true, ms: true }]) {
    try {
      const { out: sub } = hemeraSubstitute(text, flags);
      const label = flags.day && flags.ms ? 'both' : flags.day ? 'days' : 'ms';
      if (hemeraExpand(sub) !== text) errs.push(`transform-${label}`);
      if (text.includes(HEMERA_MARK) && sub !== text) errs.push('marker-input-not-refused');
    } catch (e) { errs.push('transform-throw:' + (e as Error).message); }
  }
  // Full encoder and reader on hand cases and random-0..2
  let full: null | { arm: string; M: number; identity: number } = null;
  if (idx < hand.length || ['random-0', 'random-1', 'random-2'].includes(name)) {
    const r = hemeraEncode(text, 'o200k_base');
    const plainM = daedalusEncode(text, 'o200k_base').messageTokens;   // identity baseline (not r.daedalus)
    full = { arm: r.arm, M: r.messageTokens, identity: plainM };
    if (hemeraDecode(r.wire, r.arm) !== text) errs.push('full-decode-mismatch');
    if (r.messageTokens > plainM) errs.push('M-above-identity');
  }
  const ok = errs.length === 0;
  ok ? pass++ : fail++;
  out.push(JSON.stringify({ name, bytes: text.length, ok, errs, full }));
});
console.log(out.join('\n'));
console.log(JSON.stringify({ summary: true, cases: cases.length, pass, fail }));
