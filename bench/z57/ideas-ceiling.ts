// X12 scratchpad ceilings (o200k, raw text, no codec): cheap measurements behind several candidate ideas.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const T = (s: string) => countTokens(s, 'o200k_base');
// Idea: digit grouping / base re-encoding of long numbers.
for (const s of ['1234567', '1234567890123', '98765432109876543210', '1,234,567', '1 234 567', '1_234_567', 'ff3a9c0d', 'a1b2c3d4e5f6']) console.log('digits', JSON.stringify(s), T(s));
// Idea: column delta coding (residuals instead of values) on the CSV lane.
const csv = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8').split('\n').filter(Boolean);
const rows = csv.map(r => r.split(','));
let valTok = 0, dTok = 0, n = 0;
for (let c = 1; c < rows[0].length; c++) {
  let prev: number | null = null;
  for (const r of rows.slice(1)) {
    const v = r[c]; if (v === undefined || isNaN(Number(v))) continue;
    const x = Number(v);
    valTok += T(v);
    if (prev !== null) { const d = (x - prev).toFixed(Math.max(0, (v.split('.')[1] || '').length)); dTok += T(d.startsWith('-') ? d : '+' + d); n++; }
    prev = x;
  }
}
console.log(JSON.stringify({ lane: 'vix-daily-1990.csv', valueTokens: valTok, deltaTokens: dTok, deltas: n, deltaMinusValue: dTok - valTok }));
// Idea: implicit closing tags (XML/HTML). Count closing-tag tokens that a stack rule could drop.
for (const f of ['bench/holdout-mk/chart.svg', 'bench/holdout-mk/dump.sql', 'bench/holdout-ops/page.html']) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  const closers = [...s.matchAll(/<\/[A-Za-z][\w-]*>/g)].map(m => m[0]);
  const closeTok = closers.reduce((a, c) => a + T(c), 0);
  console.log(JSON.stringify({ lane: f.split('/').pop(), totalTokens: T(s), closers: closers.length, closerTokens: closeTok, closerPct: +(100 * closeTok / T(s)).toFixed(1) }));
}
