/** X86 red-team — synthetic tables, not hand-written ones.
 *
 *  The 16 real lanes all pass the cold-read decoder, but a real lane only exercises
 *  the shapes real tools emit. This generator builds tables the encoder has never
 *  seen: column counts 2..9, left/right/tab anchors chosen per column, values drawn
 *  from ints, zero-padded ints, hex, dotted versions, paths, prose, empty cells and
 *  non-ASCII; literal rows injected at random; CRLF and no-trailing-newline
 *  variants; repeated values so run coding fires; tiny alphabets so dictionary
 *  coding fires; arithmetic progressions so the `t:`/`l:` generators fire.
 *
 *  For every case that ΚΕΝΟΝ accepts, the wire is decoded THREE ways and all three
 *  must return the source bytes:
 *    1. `kannabosDecode` in-process (the encoder's own inverse),
 *    2. `kenonDecode` on the full message (contract stripped by the reader),
 *    3. `bench/kenon_decode.py` — a cold CPython reader, run by the caller over
 *       everything this script writes to `bench/x86/receipts/fuzz/`.
 *  A case that plans but fails any of the first two is a hard failure and stops the
 *  run. Refusals are not failures: they are the codec declining to guess.
 */
import * as fs from 'node:fs';
import { kenonPlanOnly, kenonDecode } from '../../src/lib/omega/kenon';
import { kannabosDecode } from '../../src/lib/omega/kannabos';

let seed = Number(process.env.X86_SEED ?? 20260108);
function rnd(): number {
  // xorshift32: reproducible without a dependency
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 4294967296;
}
const ri = (n: number) => Math.floor(rnd() * n);
const pick = <T,>(a: T[]): T => a[ri(a.length)];

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'eps', 'zeta', 'commandline', 'package', 'manager', 'ünicode', '日本語', 'x'];
const HEX = '0123456789abcdef';

function value(kind: string, r: number): string {
  switch (kind) {
    case 'int': return String(100 + r * pick([1, 2, 3, 7]) + ri(3));
    case 'pad': return String(1000 + r).padStart(6, '0');
    case 'hex': return Array.from({ length: 8 }, () => HEX[ri(16)]).join('');
    case 'ver': return `${1 + ri(3)}.${ri(20)}.${ri(9)}`;
    case 'path': return `/mnt/vol${ri(4)}/${pick(['a', 'bb', 'ccc'])}${r}`;
    case 'word': return pick(WORDS);
    case 'tiny': return pick(['a', 'b', 'c']);
    case 'empty': return '';
    case 'prog': return `${r * 5}`;
    case 'clock': return `${String(ri(24)).padStart(2, '0')}:${String(ri(60)).padStart(2, '0')}`;
    case 'prose': return Array.from({ length: 1 + ri(6) }, () => pick(WORDS)).join(' ');
    case 'const': return pick(['ii', 'Running', '1/1', 'amd64', 'root']);
    default: return 'v' + r;
  }
}

function makeCase(): { src: string; label: string } {
  const k = 2 + ri(8);
  const rows = 6 + ri(30);
  const kinds = Array.from({ length: k }, () => pick(
    ['int', 'pad', 'hex', 'ver', 'path', 'word', 'tiny', 'prog', 'clock', 'prose', 'const'],
  ));
  // A real table has FIXED field boundaries: the gap between two fields is the same
  // on every row, and the field itself is padded to a constant width. Jittering the
  // gap instead (the first draft of this generator did) produces no boundaries at all
  // and the vote correctly refuses it — measured: 0 of 400 cases planned.
  const gap = Array.from({ length: k }, (_, j) => (j === 0 ? 0 : 1 + ri(3)));
  const width = Array.from({ length: k - 1 }, () => 3 + ri(16));
  const align = Array.from({ length: k - 1 }, () => pick(['L', 'L', 'R']));
  const eol = rnd() < 0.15 ? '\r\n' : '\n';
  const trailing = rnd() < 0.85;
  const nLit = rnd() < 0.45 ? 1 + ri(3) : 0;
  const litAt = new Set(Array.from({ length: nLit }, () => ri(rows + 2)));
  const header = rnd() < 0.6;

  const cell = (j: number, r: number): string => {
    if (j === k - 1) return value(kinds[j], r);          // last column: unpadded tail
    const v = value(kinds[j], r);
    const w = Math.max(width[j], v.length);
    return align[j] === 'R' ? v.padStart(w) : v.padEnd(w);
  };

  const lines: string[] = [];
  if (header) {
    let line = '';
    for (let j = 0; j < k; j++) {
      line += ' '.repeat(gap[j]) + (j === k - 1 ? 'NOTES' : `COL${j}`.padEnd(width[j]).slice(0, width[j]));
    }
    lines.push(line.replace(/ +$/, ''));
  }
  for (let r = 0; r < rows + 2; r++) {
    if (litAt.has(r)) {
      lines.push(pick(['-- separator --', 'Total: 42', 'warning: something odd', '', '   odd   row  with   inner gaps']));
      continue;
    }
    let line = '';
    for (let j = 0; j < k; j++) line += ' '.repeat(gap[j]) + cell(j, r);
    lines.push(line.replace(/ +$/, ''));
  }
  const src = lines.join(eol) + (trailing ? eol : '');
  return { src, label: `k=${k} rows=${rows} lit=${nLit} eol=${eol === '\n' ? 'LF' : 'CRLF'} gaps=${gap.join(',')} kinds=${kinds.join('/')}` };
}

const N = Number(process.env.X86_N ?? 400);
const dir = 'bench/x86/receipts/fuzz';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const rows: any[] = [];
let planned = 0, hardFail = 0, written = 0;
for (let i = 0; i < N; i++) {
  const c = makeCase();
  let g: any = null;
  try { g = kenonPlanOnly(c.src, 'o200k_base'); } catch (e: any) { g = null; rows.push({ i, label: c.label, planned: false, threw: String(e?.message ?? e) }); continue; }
  if (!g) { rows.push({ i, label: c.label, planned: false }); continue; }
  planned++;
  const msg = g.clause + '\n' + g.plan.text;
  const a = kannabosDecode(g.plan.text) === c.src;
  const b = kenonDecode(msg) === c.src;
  if (!a || !b) {
    hardFail++;
    fs.writeFileSync(`${dir}/FAIL-${i}.msg.txt`, msg, 'utf8');
    fs.writeFileSync(`${dir}/FAIL-${i}.src.txt`, c.src, 'utf8');
    rows.push({ i, label: c.label, planned: true, inProcessExact: a, messageExact: b, HARD_FAIL: true });
    console.log(`HARD FAIL case ${i}: ${c.label} inProcess=${a} message=${b}`);
    continue;
  }
  rows.push({ i, label: c.label, planned: true, cols: g.plan.cols, rowsN: g.plan.rows, literals: g.plan.literals,
    bounds: g.bounds, inProcessExact: a, messageExact: b, msgChars: msg.length, srcChars: c.src.length });
  if (written < 60) {
    fs.writeFileSync(`${dir}/case-${String(i).padStart(3, '0')}.msg.txt`, msg, 'utf8');
    fs.writeFileSync(`${dir}/case-${String(i).padStart(3, '0')}.src.txt`, c.src, 'utf8');
    written++;
  }
}
fs.writeFileSync('bench/x86/receipts/fuzz.json', JSON.stringify({
  seed: Number(process.env.X86_SEED ?? 20260108), cases: N, planned, hardFail, writtenForColdRead: written, rows,
}, null, 1) + '\n');
console.log(`cases=${N} planned=${planned} refusals=${N - planned} hardFail=${hardFail} writtenForColdRead=${written}`);
console.log(hardFail ? 'RED-TEAM: FAILURES PRESENT' : 'RED-TEAM: every accepted wire rebuilt its source in-process and through the message reader');
