// X53 TAXIS red team. Independent renderer written from the contract rule
// statement; invariant: any emitted plan restores byte-exactly, any full
// encode is byte-exact (candidate or fallback), no false derived column.
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { taxisPlan, taxisRestore, taxisEncode, taxisFitBlock } from '../../src/lib/omega/taxis';

let checks = 0; let fails = 0;
const failMsgs: string[] = [];
function ck(name: string, cond: boolean, extra = '') {
  checks++;
  if (!cond) { fails++; failMsgs.push(`${name} ${extra}`); }
}
function planOk(name: string, text: string, expectPlan: boolean | null = null) {
  let plan = null as ReturnType<typeof taxisPlan>;
  try { plan = taxisPlan(text); } catch (e) { ck(name, false, 'threw ' + String(e)); return null; }
  if (expectPlan !== null) ck(name + ':plan?', (plan !== null) === expectPlan);
  if (plan) ck(name + ':restore', taxisRestore(plan.reducedText, plan.spec) === text);
  return plan;
}

// --- independent aligned renderer (from the contract statement) ---
function renderAligned(hdr: string[], aligns: ('L' | 'R')[], gaps: number[], widths: number[], rows: string[][]): string[] {
  // positions: field j nominal start = sum(widths[<j] + gaps[<j]); header words placed by align in width.
  const starts: number[] = []; let acc = 0;
  for (let j = 0; j < hdr.length; j++) { starts.push(acc); acc += widths[j]! + (gaps[j] ?? 0); }
  const place = (cells: string[]): string => {
    let buf = ''; let prevEnd = 0;
    for (let j = 0; j < hdr.length; j++) {
      const c = cells[j]!;
      const wordStart = aligns[j] === 'L' ? starts[j]! : starts[j]! + widths[j]! - hdr[j]!.length;
      const wordEnd = wordStart + hdr[j]!.length;
      let start: number; let end: number;
      if (aligns[j] === 'R') { end = Math.max(wordEnd, j > 0 ? prevEnd + gaps[j - 1]! + c.length : c.length); start = end - c.length; }
      else { start = Math.max(wordStart, j > 0 ? prevEnd + gaps[j - 1]! : wordStart); end = start + c.length; }
      buf += ' '.repeat(start - buf.length) + c;
      prevEnd = end;
    }
    return buf;
  };
  return [hdr, ...rows].map(place);
}

// seeded rng
let seed = 0x5353;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]!;

function fmtPct(a: number, T: number, d: number, mode: 'trunc' | 'round'): string {
  const x = 100 * a / T * (10 ** d);
  const v = mode === 'trunc' ? Math.floor(x) : Math.floor(x + 0.5);
  return (v / (10 ** d)).toFixed(d);
}

// 1) synthetic tables with planted rules (numeric cols 1..n-2, last col free text)
const synthTally: Record<string, { planned: number; total: number }> = {};
for (let trial = 0; trial < 90; trial++) {
  const n = ri(5, 8);
  const hdr = Array.from({ length: n }, (_, j) => pick(['AA', 'B', 'CCC', 'DD', 'E', 'FF', 'GGG', 'H']) + String(j));
  const aligns = Array.from({ length: n }, () => pick(['L', 'R'] as const));
  aligns[n - 1] = 'L';
  const gaps = Array.from({ length: n - 1 }, () => ri(1, 3));
  const widths = hdr.map(h => h.length + ri(0, 5));
  const R = ri(12, 40);
  const fam = pick(['fittedPctT', 'fittedPctR', 'ceilShare', 'arithAdd', 'arithMul', 'none'] as const);
  synthTally[fam] = synthTally[fam] ?? { planned: 0, total: 0 };
  synthTally[fam]!.total++;
  const T = ri(50_000, 9_000_000);
  const rows: string[][] = [];
  for (let i = 0; i < R; i++) {
    const base = Array.from({ length: n }, (_, j) => j === n - 1 ? 'cmd' + ri(0, 99) + (rnd() < 0.3 ? ' --flag x' : '') : String(ri(0, 99999)));
    // sources: col2 (and col3); target: col1
    base[2] = String(ri(Math.floor(T / 300), Math.floor(T / 2)));
    base[3] = String(ri(1, 9999));
    if (fam === 'fittedPctT' || fam === 'fittedPctR') base[1] = fmtPct(Number(base[2]), T, 1, fam === 'fittedPctT' ? 'trunc' : 'round');
    if (fam === 'ceilShare') { const A = Number(base[2]) % 100000, B = Number(base[3]) * 7 + 1; base[2] = String(A); base[3] = String(B); base[1] = String(Math.ceil(100 * A / (A + B))) + '%'; }
    if (fam === 'arithAdd') base[1] = String(Number(base[2]) + Number(base[3]));
    if (fam === 'arithMul') { base[2] = String(ri(2, 999)); base[3] = String(ri(2, 99)); base[1] = String(Number(base[2]) * Number(base[3])); }
    rows.push(base);
  }
  const lines = renderAligned(hdr, aligns, gaps, widths, rows);
  const text = lines.join('\n') + '\n';
  const plan = planOk(`synth${trial}:${fam}`, text, fam === 'none' ? null : true);
  if (plan) synthTally[fam]!.planned++;
  if (fam !== 'none' && plan) {
    ck(`synth${trial}:rulekind`, plan.spec.rules.some(r => r.col === 1), JSON.stringify(plan.spec.rules));
  }
  if (fam === 'none' && plan) {
    // a spurious rule could in principle verify on random data; require it restores (already checked) — flag for review
    ck(`synth${trial}:spurious-rule-review`, false, JSON.stringify(plan.spec.rules));
  }
}
console.log('synthTally', JSON.stringify(synthTally));

// 2) adversarial mutations: break one row of a valid fittedPct table
{
  const hdr = ['USER', 'PID', '%MEM', 'RSS', 'CMD'];
  const aligns: ('L' | 'R')[] = ['L', 'R', 'R', 'R', 'L'];
  const gaps = [2, 1, 1, 1]; const widths = [6, 5, 4, 7, 3];
  const rows: string[][] = [];
  for (let i = 0; i < 30; i++) { const rss = ri(100, 900000); rows.push(['u' + ri(0, 9), String(ri(2, 9999)), fmtPct(rss, 4000000, 1, 'trunc'), String(rss), 'proc' + i]); }
  const good = renderAligned(hdr, aligns, gaps, widths, rows).join('\n') + '\n';
  planOk('adv:good', good, true);
  const bad = rows.map(r => [...r]); bad[7]![2] = '99.9';
  const badText = renderAligned(hdr, aligns, gaps, widths, bad).join('\n') + '\n';
  const bp = planOk('adv:one-bad-row', badText, null);
  ck('adv:one-bad-row:no-false-drop', !bp || !bp.spec.rules.some(r => r.col === 2));
  // overflow cell pushes right
  const ov = rows.map(r => [...r]); ov[3]![3] = '123456789012';
  planOk('adv:overflow', renderAligned(hdr, aligns, gaps, widths, ov).join('\n') + '\n', null);
  // passthrough lines
  planOk('adv:passthrough', '# comment line\n' + good + 'trailing note\n', true);
  // CRLF
  planOk('adv:crlf', good.replace(/\n/g, '\r\n'), true);
  // no final EOL
  planOk('adv:no-final-eol', good.slice(0, -1), true);
  // too few rows
  planOk('adv:3rows', renderAligned(hdr, aligns, gaps, widths, rows.slice(0, 3)).join('\n') + '\n', false);
  // trailing spaces
  planOk('adv:trailing-sp', good.replace('proc3\n', 'proc3  \n'), null);
  // tab inside a row (tokenizes differently -> must not produce a wrong restore)
  planOk('adv:tab', good.replace('  ', '\t'), null);
}

// 3) real tool outputs (ground truth from this sandbox's binaries)
for (const [name, cmd] of [['ps', 'ps aux'], ['dfk', 'df -k'], ['dfh', 'df -h'], ['top', 'top -bn1'], ['vmstat', 'vmstat 1 3'], ['free', 'free -k'], ['lsl', 'ls -l /bin | head -40']] as const) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    planOk('real:' + name, out, null);
  } catch { ck('real:' + name, false, 'exec failed'); }
}

// 4) non-tables must not plan
planOk('neg:prose', 'The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.\nHow vexingly quick daft zebras jump!\n', false);
planOk('neg:empty', '', false);
planOk('neg:csv', 'a,b,c\n1,2,3\n4,5,6\n7,8,9\n1,1,1\n2,2,2\n3,3,3\n4,4,4\n', null);

// 5) full encodes on small inputs: exactness invariant
for (const f of ['bench/x53/fixtures/df-k.txt', 'bench/z57/lanes/ops-ps-aux.txt']) {
  const s = fs.readFileSync(f, 'utf8');
  const r = taxisEncode(s);
  ck('full:' + f, r.exact && r.decoded === s, `applied=${r.applied}`);
}

const summary = { checks, fails, failMsgs: failMsgs.slice(0, 40) };
console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync('bench/x53/receipts/taxis-redteam.json', JSON.stringify(summary, null, 2));
