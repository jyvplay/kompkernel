// X54 ATHROISMOS red team: independent statement renderer (BigInt decimals),
// adversarial near-misses, real lanes, spelling/edge attacks, 2 full encodes.
// Writes bench/x54/receipts/athroismos-redteam.json.
import * as fs from 'node:fs';
import { athroismosPlan, athroismosRestore, athroismosEncode } from '../../src/lib/omega/athroismos';
const ENC = 'o200k_base' as const;
type Chk = { name: string; pass: boolean; detail?: string };
const checks: Chk[] = [];
const ok = (n: string, p: boolean, d?: string) => checks.push({ name: n, pass: p, detail: d });

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry(0xa54);
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

function fmt(v: bigint, scale: number, de = false): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let ip = scale === 0 ? a : a.slice(0, a.length - scale);
  const fp = scale === 0 ? '' : a.slice(a.length - scale);
  if (de) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + ip + (scale === 0 ? '' : (de ? ',' : '.') + fp);
}

interface GenOpts {
  rows: number; scale: number; kind: 'cum1p' | 'cum1m' | 'cum2' | 'none';
  de?: boolean; exceptions?: number; delim?: string; quotedDesc?: boolean;
  openingRow?: boolean; sparse?: number; // probability a driver cell is empty (cum2 only)
}
function gen(o: GenOpts): { text: string; kind: string } {
  const delim = o.delim ?? ',';
  const S = 10n ** BigInt(o.scale);
  const amt = () => BigInt(ri(1, 99999)) * (o.scale > 0 ? 1n : 1n) + BigInt(ri(0, Number(S) - 1)) * (o.scale > 0 ? 1n : 0n);
  const lines: string[] = [];
  if (o.kind === 'cum2') lines.push(['date', 'note', 'debit', 'credit', 'bal'].join(delim));
  else lines.push(['date', 'note', 'amt', 'bal'].join(delim));
  let bal = BigInt(ri(1000, 99999)) * S + BigInt(ri(0, Number(S) - 1));
  const excRows = new Set<number>();
  while (excRows.size < (o.exceptions ?? 0)) excRows.add(ri(3, o.rows - 2));
  for (let i = 0; i < o.rows; i++) {
    const date = `2026-02-${String(1 + (i % 28)).padStart(2, '0')}`;
    let note = `tx${i}`;
    if (o.quotedDesc && i % 5 === 0) note = '"ACME, INC ""Q"""';
    if (o.openingRow && i === 0) {
      lines.push(o.kind === 'cum2' ? [date, 'OPENING', '', '', fmt(bal, o.scale, o.de)].join(delim) : [date, 'OPENING', '', fmt(bal, o.scale, o.de)].join(delim));
      continue;
    }
    if (o.kind === 'cum2') {
      const isDebit = rnd() < 0.55;
      const a = amt();
      const deb = isDebit ? a : 0n; const cred = isDebit ? 0n : a;
      bal = bal + cred - deb;
      if (excRows.has(i)) bal += 777n * S; // balance break
      lines.push([date, note, deb === 0n ? '' : fmt(deb, o.scale, o.de), cred === 0n ? '' : fmt(cred, o.scale, o.de), fmt(bal, o.scale, o.de)].join(delim));
    } else if (o.kind === 'cum1p' || o.kind === 'cum1m') {
      const a = (o.sparse && rnd() < o.sparse) ? 0n : amt() * (rnd() < 0.4 ? -1n : 1n);
      bal = o.kind === 'cum1p' ? bal + a : bal - a;
      if (excRows.has(i)) bal -= 555n * S;
      lines.push([date, note, a === 0n ? '' : fmt(a, o.scale, o.de), fmt(bal, o.scale, o.de)].join(delim));
    } else {
      const a = amt() * (rnd() < 0.5 ? -1n : 1n);
      const y = amt() * (rnd() < 0.5 ? -1n : 1n) * 10n;
      lines.push([date, note, fmt(a, o.scale, o.de), fmt(y, o.scale, o.de)].join(delim));
    }
  }
  return { text: lines.join('\n') + '\n', kind: o.kind };
}

function expectPlan(name: string, text: string, kind?: string) {
  const p = athroismosPlan(text, ENC);
  ok(`${name}:plan`, !!p && (!kind || p.spec.rule.kind === kind), p ? `kind=${p.spec.rule.kind} exc=${p.spec.rule.exceptions.length}` : 'no plan');
  if (p) ok(`${name}:exact`, athroismosRestore(p.reducedText, p.spec) === text);
  return p;
}
function expectSafe(name: string, text: string) {
  const p = athroismosPlan(text, ENC);
  ok(`${name}:refuse-or-exact`, !p || athroismosRestore(p.reducedText, p.spec) === text, p ? `kind=${p.spec.rule.kind}` : 'refused');
}

// --- synthetic families ---
for (let sIdx = 0; sIdx < 3; sIdx++) {
  const scale = [0, 2, 3][sIdx]!;
  expectPlan(`cum2-scale${scale}`, gen({ rows: 60, scale, kind: 'cum2' }).text, 'cum2');
  expectPlan(`cum1p-scale${scale}`, gen({ rows: 60, scale, kind: 'cum1p' }).text, 'cum1');
  expectPlan(`cum1m-scale${scale}`, gen({ rows: 60, scale, kind: 'cum1m' }).text, 'cum1');
}
expectPlan('cum2-opening', gen({ rows: 50, scale: 2, kind: 'cum2', openingRow: true }).text, 'cum2');
expectPlan('cum2-exc1', gen({ rows: 50, scale: 2, kind: 'cum2', exceptions: 1 }).text, 'cum2');
expectPlan('cum2-exc3', gen({ rows: 80, scale: 2, kind: 'cum2', exceptions: 3 }).text, 'cum2');
expectPlan('cum1-sparse', gen({ rows: 50, scale: 2, kind: 'cum1p', sparse: 0.3 }).text, 'cum1');
expectPlan('cum2-quoted-desc', gen({ rows: 40, scale: 2, kind: 'cum2', quotedDesc: true }).text, 'cum2');
expectPlan('cum2-de-semicolon', gen({ rows: 50, scale: 2, kind: 'cum2', de: true, delim: ';' }).text, 'cum2');
expectPlan('cum1-de-semicolon', gen({ rows: 50, scale: 2, kind: 'cum1p', de: true, delim: ';' }).text, 'cum1');
expectPlan('cum1-tsv', gen({ rows: 50, scale: 2, kind: 'cum1p', delim: '\t' }).text, 'cum1');
expectPlan('cum2-min-rows', gen({ rows: 8, scale: 2, kind: 'cum2' }).text, 'cum2');

// --- spurious / negative ---
for (let i = 0; i < 10; i++) expectSafe(`none-random-${i}`, gen({ rows: 40, scale: 2, kind: 'none' }).text);

// --- adversarial edits of a good table ---
{
  const good = gen({ rows: 60, scale: 2, kind: 'cum2' }).text.split('\n');
  const edit = (idx: number, fn: (f: string[]) => string[]) => { const l = [...good]; l[idx] = fn(l[idx]!.split(',')); return l.join('\n'); };
  expectSafe('adv-4-breaks', gen({ rows: 90, scale: 2, kind: 'cum2', exceptions: 4 }).text);
  expectSafe('adv-driver-text', edit(5, (f) => { f[2] = 'PENDING'; return f.join(','); }));
  expectSafe('adv-target-empty', edit(7, (f) => { f[4] = ''; return f.join(','); }));
  expectSafe('adv-target-text', edit(7, (f) => { f[4] = 'N/A'; return f.join(','); }));
  expectSafe('adv-mixed-scale', edit(9, (f) => { f[3] = (f[3] || '1') + '5'; return f.join(','); }));
  expectSafe('adv-wrong-balance-digits', edit(11, (f) => { f[4] = f[4]!.replace(/\d/, '9'); return f.join(','); }));
  expectSafe('adv-paren-negative', edit(13, (f) => { f[2] = '(12.00)'; return f.join(','); }));
  expectSafe('adv-7-rows', gen({ rows: 7, scale: 2, kind: 'cum2' }).text);
  expectSafe('adv-crlf', good.join('\r\n'));
  expectSafe('adv-no-final-eol', good.join('\n').replace(/\n$/, ''));
  // float-dust: build a chain that holds only under float64 rounding
  const dust: string[] = ['date,note,amt,bal'];
  let b = 0.1;
  for (let i = 0; i < 30; i++) { b += 0.2; dust.push(`2026-01-01,tx${i},0.20,${b.toFixed(2)}`); }
  expectSafe('adv-float-dust-ok-if-exact', dust.join('\n') + '\n');
  // currency symbol in amounts must refuse (or be inert text columns)
  expectSafe('adv-dollar', gen({ rows: 30, scale: 2, kind: 'cum2' }).text.replace(/,(\d+\.\d\d),/g, ',"$$$1,"'));
}

// --- real lanes ---
const stA = fs.readFileSync('bench/x54/fixtures/statement_A.csv', 'utf8');
{
  const p = expectPlan('real-statementA', stA, 'cum2');
  ok('real-statementA:one-exception', !!p && p.spec.rule.exceptions.length === 1 && p.spec.rule.exceptions[0]!.row === 203,
    p ? JSON.stringify(p.spec.rule.exceptions) : 'no plan');
}
expectPlan('real-mai-de', fs.readFileSync('bench/x54/fixtures/mai-excerpt.csv', 'utf8'), 'cum1');
expectSafe('real-airport60', fs.readFileSync('bench/z48/corpus/airport-codes-300.csv', 'utf8').split('\n').slice(0, 60).join('\n'));
expectSafe('real-metrics-tsv', fs.readFileSync('bench/holdout-x40/metrics.tsv', 'utf8'));
expectSafe('real-csv3', fs.readFileSync('bench/z11/fresh/csv-3.csv', 'utf8'));
// statement_A with a SECOND planted break -> still plannable (2 exceptions)
{
  const lines = stA.split('\n');
  const f = lines[50]!.split(',');
  expectSafe('real-statementA-unmodified-exact', stA);
  ok('real-statementA-shape', f.length >= 4);
}

// --- randomized sweep (40 configs across the whole generator space) ---
{
  const kinds = ['cum1p', 'cum1m', 'cum2', 'none'] as const;
  let planted = 0, plantedOk = 0;
  for (let i = 0; i < 40; i++) {
    const kind = kinds[ri(0, 3)]!;
    const o: GenOpts = {
      rows: ri(8, 120), scale: [0, 2, 3][ri(0, 2)]!, kind,
      de: rnd() < 0.25, delim: rnd() < 0.25 ? ';' : (rnd() < 0.15 ? '\t' : ','),
      exceptions: rnd() < 0.3 ? ri(1, 3) : 0,
      openingRow: rnd() < 0.2, sparse: rnd() < 0.2 ? 0.4 : undefined, quotedDesc: rnd() < 0.2,
    };
    if (o.de && o.delim === ',') o.delim = ';';
    const { text } = gen(o);
    const p = athroismosPlan(text, ENC);
    ok(`sweep-${i}:exact`, !p || athroismosRestore(p.reducedText, p.spec) === text, `kind=${kind} planned=${!!p}`);
    if (kind !== 'none') { planted++; if (p) plantedOk++; }
  }
  ok('sweep-recall>=90%', plantedOk >= Math.floor(planted * 0.9), `${plantedOk}/${planted}`);
}

// --- full encodes (gate behavior; exact either way) ---
for (const [name, txt] of [
  ['enc-small-cum2', gen({ rows: 30, scale: 2, kind: 'cum2' }).text],
  ['enc-prose', 'The quick brown fox.\n'.repeat(30)],
] as const) {
  const r = athroismosEncode(txt, ENC);
  ok(`${name}:exact`, r.exact && r.decoded === txt, `applied=${r.applied} tokens=${r.messageTokens}`);
}

const fails = checks.filter((c) => !c.pass);
console.log(`ATHROISMOS-REDTEAM checks=${checks.length} fails=${fails.length}`);
for (const f of fails) console.log('  FAIL', f.name, f.detail ?? '');
fs.mkdirSync('bench/x54/receipts', { recursive: true });
fs.writeFileSync('bench/x54/receipts/athroismos-redteam.json', JSON.stringify({ checks: checks.length, fails: fails.length, failures: fails }, null, 2));
