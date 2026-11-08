/** X82 candidate: DELIMITER+GEOMETRY ELISION for explicitly-ruled tables.
 *  PARATAXIS collapses runs of 2+ SPACES and declares widths, so it REFUSES `|`-ruled
 *  tables (it sees no space geometry). But the pipe is paid once per field per row --
 *  O(rows x cols) -- while the field widths are O(cols). Delete the pipes, declare the
 *  geometry. The reader re-inserts them. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const D = '|';

function analyse(S: string) {
  const lines = S.split('\n');
  // maximal run of lines that start and end with the delimiter
  let best: { a: number; b: number } | null = null;
  let a = -1;
  for (let i = 0; i <= lines.length; i++) {
    const isRow = i < lines.length && lines[i].startsWith(D) && lines[i].endsWith(D) && lines[i].length > 1;
    if (isRow && a < 0) a = i;
    if (!isRow && a >= 0) { if (!best || i - a > best.b - best.a) best = { a, b: i }; a = -1; }
  }
  if (!best) return null;
  const rows = lines.slice(best.a, best.b);
  // pipe positions must be identical across every row
  const posOf = (l: string) => { const p: number[] = []; for (let j = 0; j < l.length; j++) if (l[j] === D) p.push(j); return p; };
  const p0 = posOf(rows[0]).join(',');
  if (!rows.every(l => posOf(l).join(',') === p0)) return null;
  const pos = posOf(rows[0]);
  if (pos.length < 3) return null;
  // widths: gap between consecutive pipes
  const w: number[] = [];
  for (let j = 1; j < pos.length; j++) w.push(pos[j] - pos[j - 1] - 1);
  return { a: best.a, b: best.b, rows, pos, w };
}

for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const A = analyse(S);
  const n = p.split('/').pop()!;
  if (!A) { console.log(`${n.padEnd(22)} not a ruled table`); continue; }
  const lines = S.split('\n');
  const nRows = A.b - A.a, nPipes = nRows * A.pos.length;
  console.log(`\n### ${n}  rows ${nRows}  pipes ${nPipes}  widths ${A.w.join(' ')}`);

  // A: drop the pipes, KEEP the padding -> reader re-inserts at declared widths
  const TA = lines.map((l, i) => (i >= A.a && i < A.b) ? l.split(D).join('') : l).join('\n');
  const rtA = TA.split('\n').map((l, i) => {
    if (!(i >= A.a && i < A.b)) return l;
    let o = '', c = 0;
    for (let j = 0; j < A.w.length; j++) { o += D + l.slice(c, c + A.w[j]); c += A.w[j]; }
    return o + D + l.slice(c);
  }).join('\n') === S;

  // B: drop pipes AND padding -> fields joined by tab, reader pads to width
  const TB = lines.map((l, i) => (i >= A.a && i < A.b)
    ? l.split(D).slice(1, -1).map(c => c.trim()).join('\t') : l).join('\n');
  const rtB = TB.split('\n').map((l, i) => {
    if (!(i >= A.a && i < A.b)) return l;
    const f = l.split('\t');
    if (f.length !== A.w.length) return l;
    // reconstruct '| ' + content.padEnd(w-2) + ' |'
    return D + f.map((c, j) => ' ' + c.padEnd(A.w[j] - 2) + ' ').join(D) + D;
  }).join('\n') === S;

  const cA = `§X82 the ${D} are gone; re-insert one at each column boundary, field widths ${A.w.join(' ')}.`;
  const cB = `§X82 rows: fields joined by tab, pad each to ${A.w.join(' ')}, join with ${D}, one space inside each end.`;
  const base: any = tagstackFrontier(S, enc);
  console.log(`  frontier ${base.messageTokens}  rawΔ(A) ${countTokens(TA, enc) - countTokens(S, enc)}  rtA=${rtA} | rawΔ(B) ${countTokens(TB, enc) - countTokens(S, enc)}  rtB=${rtB}`);
  for (const [name, T, rt, C] of [['A', TA, rtA, cA], ['B', TB, rtB, cB]] as [string, string, boolean, string][]) {
    if (!rt) { console.log(`  ${name}: BLOCKED rt`); continue; }
    const ct = countTokens(C, enc);
    const fT: any = tagstackFrontier(T, enc);
    const f: any = tagstackFrontier(C + '\n' + T, enc);
    console.log(`  ${name}: marginal(contract) ${f.messageTokens - fT.messageTokens}/${ct}  F ${base.messageTokens} -> ${f.messageTokens} (${f.messageTokens - base.messageTokens >= 0 ? '+' : ''}${f.messageTokens - base.messageTokens})`);
  }
}
