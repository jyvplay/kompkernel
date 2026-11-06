/**
 * X75 / t4 — CENSUS: how many cells in the wide ops lanes are ARITHMETICALLY DERIVED
 * from a sibling cell in the SAME ROW?
 *
 * This is the question no codec in the stack has asked. APOGRAPHE/METRON predict a cell
 * from the SAME COLUMN of the row above (temporal). STICHOMYTHIA generates a column
 * from a program over the row INDEX. CHIRON/DAEDALUS substitute strings. PROSPHYSIS
 * (X74) removes a cell that CONTAINS a sibling string.
 *
 * None of them computes a cell from sibling CELLS BY ARITHMETIC:
 *
 *     df -h        Use% = round(Used/Size*100)          "14%"  from  "4.0G  29G"
 *     ps           %CPU, %MEM, TIME                      from cumulative clocks
 *     ls -l        nothing
 *     metrics.tsv  derived ratios
 *     kubectl      IP / NAME increment over the row above
 *
 * The census is a pure measurement: for every numeric column pair (a, b, c), can c be
 * reproduced from a and b by one of a small closed family of functions, on EVERY row?
 * If the density is high the mechanism is worth building; if it is low the answer is
 * another honest negative.
 */
import * as fs from 'node:fs';

type N = { raw: string; v: number; scale: number };

/** parse "14%", "1.2G", "4,879", "10.244.1.5", "-" */
function parseNum(s: string): N | null {
  const m = /^(-?[\d,]+(?:\.\d+)?)(%|[KMGTkmgt]i?B?)?$/.exec(s.trim());
  if (!m) return null;
  let v = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(v)) return null;
  let scale = 1;
  const suf = (m[2] ?? '').toUpperCase();
  if (suf === '%') scale = 0;              // percentage, not scalable
  else if (suf === 'K') scale = 1e3;
  else if (suf === 'M') scale = 1e6;
  else if (suf === 'G') scale = 1e9;
  else if (suf === 'T') scale = 1e12;
  return { raw: s, v, scale };
}

const FORMS = (a: number, b: number): Array<[string, number]> => {
  const out: Array<[string, number]> = [];
  if (b !== 0) { out.push(['a/b*100', (a / b) * 100]); out.push(['b/a*100', (b / a) * 100]); }
  out.push(['a+b', a + b]); out.push(['a-b', a - b]); out.push(['b-a', b - a]);
  if (b !== 0) { out.push(['a/b', a / b]); out.push(['b/a', b / a]); }
  out.push(['a*b', a * b]);
  return out;
};

const files = process.argv.slice(2);
for (const p of files) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  // numeric grid: per line, the list of (index, value)
  const grid = lines.map((l) => l.trim().split(/\s+/).map((s, i) => ({ i, n: parseNum(s) })).filter((x) => x.n));
  const width = Math.max(...grid.map((g) => g.length));
  let best: { cols: string; form: string; rows: number; of: number } | null = null;
  // for each ordered pair of column POSITIONS and each form, count rows where it holds
  const posOf = (g: typeof grid[number]) => g.map((x) => x.i);
  for (let ca = 0; ca < width; ca++) {
    for (let cb = 0; cb < width; cb++) {
      if (ca === cb) continue;
      for (let cc = 0; cc < width; cc++) {
        if (cc === ca || cc === cb) continue;
        const counts = new Map<string, number>();
        let rows = 0;
        for (const g of grid) {
          const pos = posOf(g);
          const ia = pos.indexOf(ca), ib = pos.indexOf(cb), ic = pos.indexOf(cc);
          if (ia < 0 || ib < 0 || ic < 0) continue;
          rows++;
          const A = g[ia].n!, B = g[ib].n!, C = g[ic].n!;
          for (const [name, val] of FORMS(A.v * (A.scale || 1), B.v * (B.scale || 1))) {
            const cands = [val, Math.round(val), Math.floor(val), Math.ceil(val)];
            // the printed value may be scaled by the cell's own suffix
            const want = C.scale ? val / C.scale : val;
            const ok = cands.includes(want) || cands.includes(Math.round(want)) ||
              (C.scale === 0 && (Math.round(val) === C.v || Math.floor(val) === C.v || Math.ceil(val) === C.v));
            if (ok) counts.set(name, (counts.get(name) ?? 0) + 1);
          }
        }
        for (const [form, hits] of counts) {
          if (rows >= 4 && hits === rows && (!best || hits > best.rows)) {
            best = { cols: `${ca},${cb}->${cc}`, form, rows, of: lines.length };
          }
        }
      }
    }
  }
  // also: is any column a pure function of ONE other column (constant offset/ratio)?
  console.log(`${p.split('/').pop()!.padEnd(20)} rows ${String(lines.length).padStart(3)} numericCols ${String(width).padStart(2)} | best derived column: ${best ? `${best.form} (${best.cols}) holds on ${best.rows}/${best.of} rows` : 'NONE'}`);
}
