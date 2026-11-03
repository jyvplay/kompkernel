/**
 * X73 probe 1: is column-major transposition a cheaper representation, BEFORE
 * asking the frontier anything?
 *
 * Every lane that the stack's parents compress well is a table of records whose
 * fields are separated by single spaces. Row-major, each record re-states the
 * column structure on every line. Column-major, each column is one homogeneous
 * run, which is the shape a literal-repetition engine handles best — and the
 * reconstruction is pure mechanics: cell (r,c) is the r-th TAB-separated field of
 * the c-th line, and row r is those cells joined by single spaces.
 *
 * This probe counts tokens only. It is the cheap falsifier: if the normal form is
 * not already cheaper than the raw text, the transposition cannot survive a
 * contract that explains it.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc: any = 'o200k_base';

export type ColPlan = { K: number; rows: number[]; literal: string[]; normal: string };

/** Split on single spaces with a cap: the first K-1 spaces are separators. */
function cellsOf(line: string, K: number): string[] {
  const out: string[] = [];
  let pos = 0;
  for (let k = 0; k + 1 < K; k++) {
    const at = line.indexOf(' ', pos);
    if (at < 0) return [];
    out.push(line.slice(pos, at));
    pos = at + 1;
  }
  out.push(line.slice(pos));
  return out;
}

export function columnize(text: string, K: number): ColPlan | null {
  const lines = text.split('\n');
  const cols: string[][] = Array.from({ length: K }, () => []);
  const literal: string[] = [];
  const rows: number[] = [];
  let folded = 0;
  for (const line of lines) {
    const cs = line.length === 0 ? [] : cellsOf(line, K);
    const ok = cs.length === K && cs.every(c => !c.includes('\t') && c.length > 0)
      && cs.join(' ') === line;
    if (ok) { for (let c = 0; c < K; c++) cols[c].push(cs[c]); rows.push(folded); folded++; }
    else { literal.push(line); }
  }
  if (folded < 4) return null;
  const parts: string[] = [];
  for (let c = 0; c < K; c++) parts.push(cols[c].join('\t'));
  const normal = parts.join('\n') + (literal.length ? '\n' + literal.map(l => '\\' + l).join('\n') : '');
  return { K, rows, literal, normal };
}

for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, enc);
  let best: { K: number; tok: number; norm: number; lit: number } | null = null;
  for (let K = 2; K <= 12; K++) {
    const pl = columnize(t, K);
    if (!pl) continue;
    const tok = countTokens(pl.normal, enc);
    if (!best || tok < best.tok) best = { K, tok, norm: pl.normal.length, lit: pl.literal.length };
  }
  if (!best) { console.log(`${p}: raw ${raw}  no columnar plan`); continue; }
  const nrows = (t.split('\n').length - best.lit);
  console.log(`${p}: raw ${raw}  K=${best.K} columnar ${best.tok} (${(100 * (best.tok - raw) / raw).toFixed(1)}%)  rows=${nrows} literal=${best.lit}`);
}
