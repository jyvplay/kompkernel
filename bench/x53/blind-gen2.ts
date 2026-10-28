import * as fs from 'node:fs';
import { taxisPlan } from '../../src/lib/omega/taxis';
// T2: df-shaped synthetic-formula table on real df geometry
// header anchors from bench/x53/fixtures/df-k.txt real header:
// Filesystem L@0, 1K-blocks R ends 24, Used R ends 32, Available R ends 42, Use% R ends 47, Mounted on L@48; gaps 5,1,1,1,1
const header = 'Filesystem     1K-blocks    Used Available Use% Mounted on';
function place(cells: string[]): string {
  const ends = [0, 24, 32, 42, 47]; const starts = [0, 0, 0, 0, 0, 48];
  let buf = ''; let prevEnd = 0;
  const gaps = [5, 1, 1, 1, 1];
  for (let j = 0; j < 6; j++) {
    const c = cells[j]!;
    let start: number; let end: number;
    if (j >= 1 && j <= 4) { end = Math.max(ends[j]!, prevEnd + gaps[j - 1]! + c.length); start = end - c.length; }
    else { start = Math.max(starts[j]!, j > 0 ? prevEnd + gaps[j - 1]! : 0); end = start + c.length; }
    buf += ' '.repeat(start - buf.length) + c; prevEnd = end;
  }
  return buf;
}
let seed = 0xB2; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const mounts = ['/', '/dev', '/run', '/tmp', '/var', '/home', '/boot', '/data', '/srv', '/opt', '/usr', '/etc', '/snap', '/mnt'];
const lines = [header];
for (let i = 0; i < 14; i++) {
  const total = ri(100000, 90000000); const used = ri(0, total); const avail = Math.max(0, total - used - ri(0, 5000));
  const pct = used === 0 ? 0 : Math.ceil(100 * used / (used + avail));
  const fsnm = '/dev/sd' + String.fromCharCode(97 + i) + ri(1, 9);
  lines.push(place([fsnm, String(total), String(used), String(avail), pct + '%', mounts[i]!]));
}
const t2 = lines.join('\n') + '\n';
const p2 = taxisPlan(t2);
if (p2) {
  fs.writeFileSync('bench/x53/blind/visible/T2.message', p2.contract + '\n' + p2.reducedText);
  fs.writeFileSync('bench/x53/blind/hidden/T2.orig', t2);
  console.log('T2 ok', JSON.stringify(p2.spec.rules));
} else console.log('T2 NO PLAN');

// T3: endurance — 50-row slice of real ps-bigmem (rows 30..79)
const big = fs.readFileSync('bench/x53/fixtures/ps-bigmem.txt', 'utf8').split('\n');
const t3 = [big[0], ...big.slice(30, 80)].join('\n') + '\n';
const p3 = taxisPlan(t3);
if (p3) {
  fs.writeFileSync('bench/x53/blind/visible/T3.message', p3.contract + '\n' + p3.reducedText);
  fs.writeFileSync('bench/x53/blind/hidden/T3.orig', t3);
  console.log('T3 ok rows=' + p3.rows);
} else console.log('T3 NO PLAN');
