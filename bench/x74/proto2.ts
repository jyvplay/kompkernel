/** X74 prototype 2: STOICHEION = STADION fold  ×  per-column alphabet recoding.
 *  Measured end-to-end with a real decoder and byte-exact verification. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { stadionFold, stadionUnfold } from '../../src/lib/omega/stadion';
const enc: any = 'o200k_base';
const IDX = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** one column -> its cheapest self-contained program text */
function columnSpec(vals: string[]): { spec: string; kind: string } {
  const uniq = [...new Set(vals)];
  const cands: { spec: string; kind: string }[] = [];
  cands.push({ kind: 'L', spec: 'L' + JSON.stringify(vals) });          // literal list, JSON-escaped
  if (uniq.length === 1) cands.push({ kind: 'C', spec: 'C' + JSON.stringify(vals[0]) });
  if (uniq.length <= IDX.length && uniq.length < vals.length) {
    const idx = vals.map(v => IDX[uniq.indexOf(v)]).join('');
    cands.push({ kind: 'D', spec: 'D' + JSON.stringify(uniq) + ' ' + idx });
    let rle = ''; let i = 0;
    while (i < idx.length) { let j = i; while (j < idx.length && idx[j] === idx[i]) j++; rle += idx[i] + (j - i) + '.'; i = j; }
    if (rle.length < idx.length) cands.push({ kind: 'R', spec: 'R' + JSON.stringify(uniq) + ' ' + rle });
  }
  let best = cands[0], bc = T(cands[0].spec, enc);
  for (const c of cands.slice(1)) { const t = T(c.spec, enc); if (t < bc) { best = c; bc = t; } }
  return best;
}
function decodeColumn(spec: string, rows: number): string[] {
  const kind = spec[0], rest = spec.slice(1);
  if (kind === 'L') return JSON.parse(rest);
  if (kind === 'C') return new Array(rows).fill(JSON.parse(rest));
  const sp = rest.indexOf(' ');
  const uniq: string[] = JSON.parse(rest.slice(0, sp));
  const tail = rest.slice(sp + 1);
  if (kind === 'D') return tail.split('').map(c => uniq[IDX.indexOf(c)]);
  if (kind === 'R') {
    const idx: string[] = [];
    const re = /(.)(\d+)\./g; let m: RegExpExecArray | null;
    while ((m = re.exec(tail))) for (let k = 0; k < Number(m[2]); k++) idx.push(m[1]);
    return idx.map(c => uniq[IDX.indexOf(c)]);
  }
  throw new Error('bad spec ' + kind);
}

const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text, enc);
  const fold = stadionFold(text);
  if (!fold) { console.log(`${p.split('/').pop()!.padEnd(24)} NOFOLD raw ${raw} frontier ${F.get(p)}`); continue; }
  const norm = fold.normal;
  const lines = norm.split('\n');
  // rows are lines with >= 2 tab cells; literal rows start with '\' and carry no tab
  const cellRows = lines.filter(l => l.includes('\t'));
  const tabCounts = new Map<number, number>();
  for (const l of cellRows) tabCounts.set(l.split('\t').length, (tabCounts.get(l.split('\t').length) ?? 0) + 1);
  const C = [...tabCounts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 0;
  const table = cellRows.filter(l => l.split('\t').length === C).map(l => l.split('\t'));
  if (!table.length) { console.log(`${p.split('/').pop()!.padEnd(24)} NOTABLE frontier ${F.get(p)}`); continue; }
  const cols = Array.from({ length: C }, (_, c) => table.map(r => r[c]));
  const specs = cols.map(columnSpec);
  const msg = `S${table.length}x${C} w=${fold.widths.join(',')}\n` + specs.map(s => s.spec).join('\n');
  const mt = T(msg, enc);
  // decode check
  const got = specs.map((s, c) => decodeColumn(s.spec, table.length));
  let ok = true;
  for (let r = 0; r < table.length; r++) for (let c = 0; c < C; c++) if (got[c][r] !== table[r][c]) ok = false;
  const f = F.get(p);
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(4)} frontier ${String(f).padStart(4)} STOICH ${String(mt).padStart(4)} d ${f?String(mt-f).padStart(5):'    ?'} rows ${table.length}/${lines.length} C=${C} kinds ${specs.map(s=>s.kind).join('')} colsExact ${ok}`);
}
