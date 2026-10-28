import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { taxisPlan } from '../../src/lib/omega/taxis';
fs.mkdirSync('bench/x53/blind/visible', { recursive: true });
fs.mkdirSync('bench/x53/blind/hidden', { recursive: true });
fs.mkdirSync('bench/x53/blind/decode', { recursive: true });

// T1: fresh real ps excerpt (header + 24 rows, seed-fixed slice: rows 40..63)
const ps = execSync('ps aux', { encoding: 'utf8' });
const lines = ps.split('\n');
const t1 = [lines[0], ...lines.slice(40, 64)].join('\n') + '\n';
// T2: ceilShare synthetic-formula table (df-like, values computed by the df rule)
let seed = 0xB1; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const rows: string[] = ['Filesystem     1K-blocks    Used Available Use% Mounted on'];
const mounts = ['/', '/dev', '/run', '/tmp', '/var', '/home', '/boot', '/data', '/srv', '/opt', '/usr', '/etc'];
for (let i = 0; i < 12; i++) {
  const total = ri(100000, 90000000); const used = ri(0, total); const avail = total - used - ri(0, 5000);
  const pct = used === 0 ? 0 : Math.ceil(100 * used / (used + avail));
  const fsnm = '/dev/sd' + String.fromCharCode(97 + i) + ri(1, 9);
  rows.push(fsnm.padEnd(15) + ' ' + String(total).padStart(9) + ' ' + String(used).padStart(7) + ' ' + String(avail).padStart(9) + ' ' + (pct + '%').padStart(4) + ' ' + mounts[i]);
}
const t2 = rows.join('\n') + '\n';
for (const [name, text] of [['T1', t1], ['T2', t2]] as const) {
  const p = taxisPlan(text);
  if (!p) { console.log(name, 'NO PLAN'); continue; }
  fs.writeFileSync(`bench/x53/blind/visible/${name}.message`, p.contract + '\n' + p.reducedText);
  fs.writeFileSync(`bench/x53/blind/hidden/${name}.orig`, text);
  console.log(name, 'ok rows=' + p.rows);
}
