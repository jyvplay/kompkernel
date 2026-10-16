/** POLYCHRON red team: exactness, collision handling, deterministic wire, and message gate. */
import fs from 'node:fs';
import path from 'node:path';
import { polychronEncode, polychronDecode, polychronForward, polychronRestore } from '@/lib/omega/polychron';

const ROOT = '/home/user/kompkernel';
const receiptDir = path.join(ROOT, 'bench/polychron/receipts');
fs.mkdirSync(receiptDir, { recursive: true });
const receiptPath = path.join(receiptDir, 'redteam.jsonl');
const rows: string[] = [];
let total = 0;
let failures = 0;
let transformed = 0;

function check(name: string, text: string) {
  total++;
  const forward = polychronForward(text);
  const forwardOk = !forward || polychronRestore(forward.text) === text;
  const a = polychronEncode(text, 'o200k_base');
  const b = polychronEncode(text, 'o200k_base');
  const decoded = polychronDecode(a.wire);
  const decodeOk = decoded === text && Buffer.from(decoded, 'utf8').equals(Buffer.from(text, 'utf8')) && a.decoded === text && a.exact;
  const deterministic = a.wire === b.wire && a.arm === b.arm;
  const gateOk = a.arm === 'identity' || a.messageTokens.o200k_base < a.baseTokens.o200k_base;
  const ok = forwardOk && decodeOk && deterministic && gateOk;
  if (a.transformed) transformed++;
  if (!ok) failures++;
  const row = { name, ok, forwardOk, decodeOk, deterministic, gateOk, arm: a.arm, days: a.days, dp: a.dp, M: a.messageTokens.o200k_base, baseM: a.baseTokens.o200k_base };
  rows.push(JSON.stringify(row));
}

const cases: Array<[string, string]> = [
  ['vix-like-final-newline', 'DATE,OPEN,HIGH,LOW,CLOSE\n1990-01-02,17.240000,17.240000,17.240000,17.240000\n1990-01-03,18.190000,18.190000,18.190000,18.190000\n'],
  ['vix-like-no-final-newline', 'DATE,OPEN,HIGH\n1990-01-02,17.240000,17.240000\n1990-01-05,18.190000,18.190000'],
  ['vix-crlf', 'DATE,OPEN\r\n1990-01-02,17.240000\r\n1990-01-03,18.190000\r\n'],
  ['negative-day-step', 'DATE,OPEN\n1990-01-05,17.240000\n1990-01-02,18.190000\n'],
  ['non-consecutive-day-step', 'DATE,OPEN\n1990-01-02,17.240000\n1990-02-20,18.190000\n'],
  ['no-date-delta', 'DATE,OPEN\n1990-01-02,17.240000\n1990-01-02,18.190000\n'],
  ['no-fixed-decimal', 'DATE,OPEN\n1990-01-02,17\n1990-01-03,18\n'],
  ['mixed-decimal-width', 'DATE,OPEN\n1990-01-02,17.24\n1990-01-03,18.1900\n'],
  ['invalid-date-literal', 'DATE,OPEN\n1990-02-30,17.240000\n1990-03-01,18.190000\n'],
  ['marker-collision', 'DATE,OPEN\n1990-01-02,17.240000\n※d1,18.190000\n'],
  ['header-collision', '@dp 0,6\nDATE,OPEN\n1990-01-02,17.240000\n1990-01-03,18.190000\n'],
  ['raw-marker-collision', '@raw\nDATE,OPEN\n1990-01-02,17.240000\n1990-01-03,18.190000\n'],
  ['single-row', 'DATE,OPEN\n1990-01-02,17.240000\n'],
  ['unicode-header', 'дата,цена\n1990-01-02,17.240000\n1990-01-03,18.190000\n'],
  ['prose', 'Dates are useful, but this paragraph is not a table.\nIt contains 17.240000 as prose.\n'],
];
for (const [name, text] of cases) check('edge:' + name, text);

let seed = 0x5eedc0de;
function rnd(): number {
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) | 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) | 0;
  return ((seed ^ (seed >>> 16)) >>> 0) / 0x1_0000_0000;
}
for (let k = 0; k < 250; k++) {
  const rowsN = 2 + Math.floor(rnd() * 28);
  const cols = 2 + Math.floor(rnd() * 4);
  const dp = 1 + Math.floor(rnd() * 7);
  const eol = rnd() < 0.25 ? '\r\n' : '\n';
  const lines = ['date,' + Array.from({ length: cols - 1 }, (_, i) => `value${i}`).join(',')];
  let day = 2;
  for (let r = 0; r < rowsN; r++) {
    day += Math.floor(rnd() * 4);
    const month = 1 + Math.floor(day / 28);
    const dom = 1 + (day % 28);
    const values = Array.from({ length: cols - 1 }, () => {
      const whole = Math.floor(rnd() * 10000);
      const frac = String(Math.floor(rnd() * 10 ** dp)).padStart(dp, '0');
      return `${whole}.${frac}`;
    });
    lines.push(`2026-${String(Math.min(month, 12)).padStart(2, '0')}-${String(dom).padStart(2, '0')},${values.join(',')}`);
  }
  check(`fuzz:${k}`, lines.join(eol) + (rnd() < 0.8 ? eol : ''));
}

fs.writeFileSync(receiptPath, rows.join('\n') + '\n', 'utf8');
console.error(`POLYCHRON redteam: ${total - failures}/${total} exact gates; transformed=${transformed}; failures=${failures}; receipt=${receiptPath}`);
if (failures) process.exitCode = 1;
