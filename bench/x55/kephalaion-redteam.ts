// X55 KEPHALAION red team: independent aggregate-table renderer, adversarial
// near-misses, real lanes, randomized sweep, 2 full encodes.
// Writes bench/x55/receipts/kephalaion-redteam.json.
import * as fs from 'node:fs';
import { kephalaionPlan, kephalaionRestore, kephalaionEncode } from '../../src/lib/omega/kephalaion';
const ENC = 'o200k_base' as const;
type Chk = { name: string; pass: boolean; detail?: string };
const checks: Chk[] = [];
const ok = (n: string, p: boolean, d?: string) => checks.push({ name: n, pass: p, detail: d });

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry(0x55e55);
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

function fmt(v: bigint, scale: number, de = false): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let ip = scale === 0 ? a : a.slice(0, a.length - scale);
  const fp = scale === 0 ? '' : a.slice(a.length - scale);
  if (de) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + ip + (scale === 0 ? '' : (de ? ',' : '.') + fp);
}

interface Opts {
  rows: number; nTerms: number; scale?: number; kind: 'rowsum' | 'headsum' | 'colsum' | 'both' | 'none';
  delim?: string; de?: boolean; exceptions?: number; emptyP?: number; tgtPos?: 'last' | 'first' | 'mid';
  totalRowAt?: 'last' | 'first' | 'midlabel';
}
function gen(o: Opts): string {
  const delim = o.delim ?? ',';
  const scale = o.scale ?? 0;
  const SS = 10n ** BigInt(scale);
  const val = () => BigInt(ri(0, 999)) * SS + BigInt(scale ? ri(0, Number(SS) - 1) : 0);
  const nT = o.nTerms;
  const names: string[] = [];
  for (let i = 0; i < nT; i++) names.push('c' + i);
  const body: (bigint | null)[][] = [];
  for (let r = 0; r < o.rows; r++) {
    body.push(Array.from({ length: nT }, () => (o.emptyP && rnd() < o.emptyP ? null : val())));
  }
  const excRows = new Set<number>();
  while (excRows.size < (o.exceptions ?? 0)) excRows.add(ri(2, o.rows - 2));
  const lines: string[] = [];
  const rowsWithTarget: string[][] = [];
  for (let r = 0; r < o.rows; r++) {
    const cells = body[r]!.map((v) => (v === null ? '' : fmt(v, scale, o.de)));
    let tgt = '';
    if (o.kind === 'rowsum' || o.kind === 'both') {
      let s = body[r]!.reduce<bigint>((acc, v) => acc + (v ?? 0n), 0n);
      if (excRows.has(r)) s += 13n * SS;
      tgt = fmt(s, scale, o.de);
    } else if (o.kind === 'headsum') {
      let s = (body[r]![0] ?? 0n) - body[r]!.slice(2).reduce<bigint>((acc, v) => acc + (v ?? 0n), 0n);
      if (excRows.has(r)) s -= 7n * SS;
      tgt = fmt(s, scale, o.de); // target replaces c1 slot (see assembly)
    } else {
      tgt = fmt(val() * 3n, scale, o.de);
    }
    let row: string[];
    if (o.kind === 'headsum') {
      row = [cells[0]!, tgt, ...cells.slice(2)];
    } else if (o.tgtPos === 'first') row = [tgt, ...cells];
    else if (o.tgtPos === 'mid') { row = [...cells]; row.splice(Math.floor(nT / 2), 0, tgt); }
    else row = [...cells, tgt];
    rowsWithTarget.push([`r${r}`, ...row]);
  }
  const hdrNames = o.kind === 'headsum'
    ? ['id', names[0]!, 'net', ...names.slice(2)]
    : o.tgtPos === 'first' ? ['id', 'tot', ...names]
    : o.tgtPos === 'mid' ? ['id', ...names.slice(0, Math.floor(nT / 2)), 'tot', ...names.slice(Math.floor(nT / 2))]
    : ['id', ...names, 'tot'];
  lines.push(hdrNames.join(delim));
  for (const r of rowsWithTarget) lines.push(r.join(delim));
  if (o.kind === 'colsum' || o.kind === 'both') {
    // aggregate row: numeric cells = sums of their columns (body terms only; target col too when both)
    const nCols = hdrNames.length;
    const sums: string[] = ['Total'];
    const numCols = nCols - 1;
    // recompute per finished column from rowsWithTarget strings
    for (let c = 1; c < nCols; c++) {
      let s = 0n;
      for (const r of rowsWithTarget) {
        const cell = r[c]!;
        if (cell === '') continue;
        const norm = o.de ? cell.replace(/\./g, '').replace(',', '.') : cell;
        const [ip, fp = ''] = norm.split('.');
        const neg = ip!.startsWith('-');
        const mag = BigInt((neg ? ip!.slice(1) : ip) + fp.padEnd(scale, '0').slice(0, scale));
        s += neg ? -mag : mag;
      }
      sums.push(fmt(s, scale, o.de));
    }
    const aggLine = sums.join(delim);
    if (o.totalRowAt === 'first') lines.splice(1, 0, aggLine);
    else if (o.totalRowAt === 'midlabel') lines.splice(Math.floor(lines.length / 2), 0, aggLine);
    else lines.push(aggLine);
  }
  return lines.join('\n') + '\n';
}

function expectPlan(name: string, text: string, want: { rowsum?: boolean; colsum?: boolean } = {}) {
  const p = kephalaionPlan(text, ENC);
  let good = !!p;
  if (p && want.rowsum !== undefined) good = good && !!p.spec.rowsum === want.rowsum;
  if (p && want.colsum !== undefined) good = good && !!p.spec.colsum === want.colsum;
  ok(`${name}:plan`, good, p ? `rowsum=${!!p.spec.rowsum} colsum=${!!p.spec.colsum}` : 'no plan');
  if (p) ok(`${name}:exact`, kephalaionRestore(p.reducedText, p.spec) === text);
  return p;
}
function expectSafe(name: string, text: string) {
  const p = kephalaionPlan(text, ENC);
  ok(`${name}:refuse-or-exact`, !p || kephalaionRestore(p.reducedText, p.spec) === text, p ? 'planned' : 'refused');
}

// families
for (const nt of [2, 3, 5, 13]) expectPlan(`rowsum-terms${nt}`, gen({ rows: 40, nTerms: nt, kind: 'rowsum' }), { rowsum: true });
for (const sc of [0, 2]) expectPlan(`rowsum-scale${sc}`, gen({ rows: 40, nTerms: 4, kind: 'rowsum', scale: sc }), { rowsum: true });
expectPlan('rowsum-first', gen({ rows: 30, nTerms: 4, kind: 'rowsum', tgtPos: 'first' }), { rowsum: true });
expectPlan('rowsum-mid', gen({ rows: 30, nTerms: 6, kind: 'rowsum', tgtPos: 'mid' }), { rowsum: true });
expectPlan('rowsum-empty-terms', gen({ rows: 40, nTerms: 5, kind: 'rowsum', emptyP: 0.25 }), { rowsum: true });
expectPlan('rowsum-exc2', gen({ rows: 50, nTerms: 4, kind: 'rowsum', exceptions: 2 }), { rowsum: true });
expectPlan('rowsum-de', gen({ rows: 30, nTerms: 4, kind: 'rowsum', scale: 2, de: true, delim: ';' }), { rowsum: true });
expectPlan('rowsum-tsv', gen({ rows: 30, nTerms: 4, kind: 'rowsum', delim: '\t' }), { rowsum: true });
expectPlan('headsum', gen({ rows: 40, nTerms: 5, kind: 'headsum' }), { rowsum: true });
expectPlan('colsum-last', gen({ rows: 25, nTerms: 4, kind: 'colsum', totalRowAt: 'last' }), { colsum: true });
expectPlan('colsum-first', gen({ rows: 25, nTerms: 4, kind: 'colsum', totalRowAt: 'first' }), { colsum: true });
expectPlan('colsum-midlabel', gen({ rows: 25, nTerms: 4, kind: 'colsum', totalRowAt: 'midlabel' }), { colsum: true });
expectPlan('both', gen({ rows: 30, nTerms: 4, kind: 'both' }), {});

// adversarial
{
  expectSafe('adv-4-exceptions', gen({ rows: 60, nTerms: 4, kind: 'rowsum', exceptions: 4 }));
  expectSafe('adv-none', gen({ rows: 40, nTerms: 4, kind: 'none' }));
  const good = gen({ rows: 30, nTerms: 4, kind: 'rowsum' }).split('\n');
  const e1 = [...good]; { const f = e1[5]!.split(','); f[f.length - 1] = ''; e1[5] = f.join(','); }
  expectSafe('adv-target-empty', e1.join('\n'));
  const e2 = [...good]; { const f = e2[7]!.split(','); f[1] = 'x9'; e2[7] = f.join(','); }
  expectSafe('adv-term-text', e2.join('\n'));
  const e3 = [...good]; { const f = e3[9]!.split(','); f[f.length - 1] = String(Number(f[f.length - 1]) + 1); e3[9] = f.join(','); }
  expectSafe('adv-off-by-one-row', e3.join('\n'));
  const cs = gen({ rows: 20, nTerms: 4, kind: 'colsum' }).split('\n');
  const e4 = [...cs]; { const i = e4.length - 2; const f = e4[i]!.split(','); f[2] = String(Number(f[2]) + 5); e4[i] = f.join(','); }
  expectSafe('adv-colsum-wrong-cell', e4.join('\n'));
  expectSafe('adv-crlf', good.join('\r\n'));
  expectSafe('adv-no-final-eol', good.join('\n').replace(/\n$/, ''));
  expectSafe('adv-5-rows', gen({ rows: 5, nTerms: 3, kind: 'rowsum' }));
  // float-dust rowsum (0.1 steps)
  const dust = ['id,a,b,c,tot'];
  for (let i = 0; i < 20; i++) dust.push(`r${i},0.10,0.20,0.30,0.60`);
  expectSafe('adv-float-dust-constant', dust.join('\n') + '\n');
}

// real lanes
{
  const p = expectPlan('real-ethiopia', fs.readFileSync('bench/x55/fixtures/ethiopia-covid-regions.csv', 'utf8'), { rowsum: true });
  ok('real-ethiopia:13-terms', !!p && p.spec.rowsum!.terms.length === 13 && p.spec.rowsum!.exceptions.length === 0);
  expectSafe('real-statewise', fs.readFileSync('bench/x55/fixtures/state_wise.csv', 'utf8'));
  expectSafe('real-acad', fs.readFileSync('bench/x55/fixtures/academic-performance.csv', 'utf8'));
  expectSafe('real-airport60', fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8').split('\n').slice(0, 60).join('\n'));
  expectSafe('real-statementA', fs.readFileSync('bench/x54/fixtures/statement_A.csv', 'utf8'));
  expectSafe('real-mai', fs.readFileSync('bench/x54/fixtures/mai-excerpt.csv', 'utf8'));
  expectSafe('real-metrics', fs.readFileSync('bench/holdout-x40/metrics.tsv', 'utf8'));
}

// randomized sweep
{
  const kinds = ['rowsum', 'headsum', 'colsum', 'both', 'none'] as const;
  let planted = 0, plantedOk = 0;
  for (let i = 0; i < 40; i++) {
    const kind = kinds[ri(0, 4)]!;
    const o: Opts = {
      rows: ri(8, 80), nTerms: ri(2, 8), kind, scale: [0, 2][ri(0, 1)]!,
      delim: rnd() < 0.2 ? ';' : ',', de: rnd() < 0.2,
      exceptions: rnd() < 0.3 ? ri(1, 3) : 0, emptyP: rnd() < 0.25 ? 0.3 : 0,
      tgtPos: (['last', 'first', 'mid'] as const)[ri(0, 2)]!,
      totalRowAt: (['last', 'first', 'midlabel'] as const)[ri(0, 2)]!,
    };
    if (o.de && o.delim === ',') o.delim = ';';
    const text = gen(o);
    const p = kephalaionPlan(text, ENC);
    ok(`sweep-${i}:exact`, !p || kephalaionRestore(p.reducedText, p.spec) === text, `kind=${kind} planned=${!!p}`);
    if (kind !== 'none') { planted++; if (p) plantedOk++; }
  }
  ok('sweep-recall>=85%', plantedOk >= Math.floor(planted * 0.85), `${plantedOk}/${planted}`);
}

// full encodes
for (const [name, txt] of [
  ['enc-rowsum-small', gen({ rows: 25, nTerms: 4, kind: 'rowsum' })],
  ['enc-prose', 'The quick brown fox.\n'.repeat(30)],
] as const) {
  const r = kephalaionEncode(txt, ENC);
  ok(`${name}:exact`, r.exact && r.decoded === txt, `applied=${r.applied} tokens=${r.messageTokens}`);
}

const fails = checks.filter((c) => !c.pass);
console.log(`KEPHALAION-REDTEAM checks=${checks.length} fails=${fails.length}`);
for (const f of fails) console.log('  FAIL', f.name, f.detail ?? '');
fs.mkdirSync('bench/x55/receipts', { recursive: true });
fs.writeFileSync('bench/x55/receipts/kephalaion-redteam.json', JSON.stringify({ checks: checks.length, fails: fails.length, failures: fails }, null, 2));
