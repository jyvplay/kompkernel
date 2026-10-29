// X56 ISOSKELES red team: independent symmetric-square generator, adversarial
// asymmetries, shape variants, real lanes, randomized sweep, 2 full encodes.
// Writes bench/x56/receipts/isoskeles-redteam.json.
import * as fs from 'node:fs';
import { isoskelesPlan, isoskelesRestore, isoskelesEncode } from '../../src/lib/omega/isoskeles';
const ENC = 'o200k_base' as const;
type Chk = { name: string; pass: boolean; detail?: string };
const checks: Chk[] = [];
const ok = (n: string, p: boolean, d?: string) => checks.push({ name: n, pass: p, detail: d });

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry(0x56e56);
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

interface Opts {
  n: number; delim?: string; header?: boolean; labels?: boolean; pad?: number;
  diag?: 'zero' | 'one' | 'vary' | 'empty';
  asym?: number;        // number of asymmetric pairs to plant
  crlf?: boolean; finalEol?: boolean; bom?: boolean;
  labelMismatch?: boolean; // labels != header names
}
function gen(o: Opts): string {
  const delim = o.delim ?? ',';
  const header = o.header !== false;
  const labels = o.labels !== false;
  const n = o.n;
  const names: string[] = Array.from({ length: n }, (_, i) => 'name' + i);
  const cellVal = () => (ri(0, 99999) / 100).toFixed(2);
  const M: string[][] = Array.from({ length: n }, () => Array(n).fill(''));
  for (let i = 0; i < n; i++) {
    M[i]![i] = o.diag === 'one' ? '1.000000' : o.diag === 'vary' ? cellVal() : o.diag === 'empty' ? '' : '0';
    for (let j = i + 1; j < n; j++) { const v = cellVal(); M[i]![j] = v; M[j]![i] = v; }
  }
  const wantAsym = Math.min(o.asym ?? 0, (n * (n - 1)) / 2);
  let planted = 0;
  let guard = 0;
  while (planted < wantAsym && guard++ < 100000) {
    const i = ri(1, n - 1), j = ri(0, i - 1);
    if (M[i]![j] === '999.99') continue;
    M[i]![j] = '999.99'; planted++;
  }
  const pad = Array(o.pad ?? 0).fill('');
  const lines: string[] = [];
  if (header) lines.push([...(labels ? [''] : []), ...(labels ? names : names), ...pad].join(delim));
  for (let i = 0; i < n; i++) {
    const label = o.labelMismatch ? 'row' + i : names[i]!;
    lines.push([...(labels ? [label] : []), ...M[i]!, ...pad].join(delim));
  }
  const eol = o.crlf ? '\r\n' : '\n';
  return (o.bom ? '\ufeff' : '') + lines.join(eol) + (o.finalEol === false ? '' : eol);
}

function expectPlan(name: string, text: string, want: { n?: number; diag?: string | null } = {}) {
  const p = isoskelesPlan(text, ENC);
  let good = !!p;
  if (p && want.n !== undefined) good = good && p.spec.n === want.n;
  if (p && want.diag !== undefined) good = good && p.spec.diagConst === want.diag;
  ok(`${name}:plan`, good, p ? `n=${p.spec.n} hdr=${p.spec.header} lab=${p.spec.labelCols} diag=${p.spec.diagConst} exc=${p.spec.exceptionPairs}` : 'no plan');
  if (p) ok(`${name}:exact`, isoskelesRestore(p.reducedText, p.spec) === text);
  return p;
}
function expectSafe(name: string, text: string) {
  const p = isoskelesPlan(text, ENC);
  ok(`${name}:refuse-or-exact`, !p || isoskelesRestore(p.reducedText, p.spec) === text, p ? 'planned' : 'refused');
}

// families
for (const n of [6, 8, 15, 30]) expectPlan(`sym-n${n}`, gen({ n }));
expectPlan('sym-diag1', gen({ n: 10, diag: 'one' })); // planner may subsume into the (n+1)x(n+1) names-square with diag kept
expectPlan('sym-diag-vary', gen({ n: 10, diag: 'vary' }));
expectPlan('sym-diag-zero-blanked', gen({ n: 10, diag: 'zero' }));
expectPlan('sym-nolabel', gen({ n: 9, labels: false, header: false }));
expectPlan('sym-header-only', gen({ n: 9, labels: false }));
expectPlan('sym-pad2', gen({ n: 9, pad: 2 }));
expectPlan('sym-semicolon', gen({ n: 8, delim: ';' }));
expectPlan('sym-tsv', gen({ n: 8, delim: '\t' }));
expectPlan('sym-crlf', gen({ n: 8, crlf: true }));
expectPlan('sym-bom', gen({ n: 8, bom: true }));
expectPlan('sym-asym2', gen({ n: 14, asym: 2 }));
expectPlan('sym-labelmismatch', gen({ n: 9, labelMismatch: true }));

// adversarial
{
  expectSafe('adv-asym-many', gen({ n: 12, asym: 20 }));
  expectSafe('adv-asym-1-pair-tiny', gen({ n: 6, asym: 1 }));
  expectSafe('adv-5x5-below-min', gen({ n: 5, header: false, labels: false }));
  const rect = gen({ n: 8 }).split('\n').slice(0, 7).join('\n') + '\n';
  expectSafe('adv-rectangular', rect);
  const g = gen({ n: 10 }).split('\n');
  const e1 = [...g]; { const f = e1[3]!.split(','); f[5] = '"1,5"'; e1[3] = f.join(','); }
  expectSafe('adv-quoted-comma-cell', e1.join('\n'));
  const e2 = [...g]; { const f = e2[4]!.split(','); f.splice(2, 1); e2[4] = f.join(','); }
  expectSafe('adv-ragged-row', e2.join('\n'));
  const e3 = [...g]; e3.splice(5, 0, '');
  expectSafe('adv-blank-line', e3.join('\n'));
  expectSafe('adv-no-final-eol', gen({ n: 9, finalEol: false }));
  expectSafe('adv-diag-empty', gen({ n: 9, diag: 'empty' }));
  // antisymmetric: M[i][j] = -M[j][i]
  const n = 9; const M: string[][] = Array.from({ length: n }, () => Array(n).fill('0'));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = String(ri(1, 99)); M[i]![j] = v; M[j]![i] = '-' + v; }
  const anti = ['x,' + M.map((_, i) => 'c' + i).join(','), ...M.map((r, i) => 'c' + i + ',' + r.join(','))].join('\n') + '\n';
  expectSafe('adv-antisymmetric', anti);
}

// real lanes + refusals
{
  const us = expectPlan('real-us31', fs.readFileSync('bench/x56/fixtures/us-cities-distance-matrix.csv', 'utf8'));
  ok('real-us31:square32', !!us && us.spec.n === 32 && us.spec.exceptionPairs === 0);
  expectPlan('real-eu24', fs.readFileSync('bench/x56/fixtures/eu-cities-distance-matrix.csv', 'utf8'), { n: 25 });
  expectPlan('real-corr14', fs.readFileSync('bench/x56/fixtures/ethiopia-regions-corr-matrix.csv', 'utf8'), { n: 14, diag: '1.000000' });
  expectPlan('real-goal3', fs.readFileSync('bench/x56/fixtures/goal3-corr-matrix.csv', 'utf8'));
  expectSafe('real-airport60', fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8').split('\n').slice(0, 60).join('\n'));
  expectSafe('real-metrics', fs.readFileSync('bench/holdout-x40/metrics.tsv', 'utf8'));
  expectSafe('real-statementA', fs.readFileSync('bench/x54/fixtures/statement_A.csv', 'utf8'));
  expectSafe('real-ethiopia', fs.readFileSync('bench/x55/fixtures/ethiopia-covid-regions.csv', 'utf8'));
}

// randomized sweep
{
  let planted = 0, plantedOk = 0;
  for (let i = 0; i < 40; i++) {
    const isSym = rnd() < 0.7;
    const o: Opts = {
      n: ri(6, 24),
      delim: rnd() < 0.2 ? ';' : ',',
      header: rnd() < 0.8, labels: rnd() < 0.8, pad: rnd() < 0.3 ? ri(1, 2) : 0,
      diag: (['zero', 'one', 'vary'] as const)[ri(0, 2)]!,
      asym: isSym ? (rnd() < 0.3 ? ri(1, 3) : 0) : ri(10, 40),
      crlf: rnd() < 0.2, bom: rnd() < 0.2,
    };
    const text = gen(o);
    const p = isoskelesPlan(text, ENC);
    ok(`sweep-${i}:exact`, !p || isoskelesRestore(p.reducedText, p.spec) === text, `sym=${isSym} planned=${!!p}`);
    if (isSym) { planted++; if (p) plantedOk++; }
  }
  ok('sweep-recall>=85%', plantedOk >= Math.floor(planted * 0.85), `${plantedOk}/${planted}`);
}

console.log('plan-level checks done:', checks.length, 'running full encodes...');
// full encodes (fallback exactness; gate paths exercised separately)
for (const [name, txt] of [
  ['enc-goal3', fs.readFileSync('bench/x56/fixtures/goal3-corr-matrix.csv', 'utf8')],
  ['enc-prose', 'The quick brown fox.\n'.repeat(30)],
] as const) {
  const r = isoskelesEncode(txt, ENC);
  ok(`${name}:exact`, r.exact && r.decoded === txt, `applied=${r.applied} tokens=${r.messageTokens}`);
}

const fails = checks.filter((c) => !c.pass);
console.log(`ISOSKELES-REDTEAM checks=${checks.length} fails=${fails.length}`);
for (const f of fails) console.log('  FAIL', f.name, f.detail ?? '');
fs.mkdirSync('bench/x56/receipts', { recursive: true });
fs.writeFileSync('bench/x56/receipts/isoskeles-redteam.json', JSON.stringify({ checks: checks.length, fails: fails.length, failures: fails }, null, 2));
