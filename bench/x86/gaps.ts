/** X86 — ΚΕΝΟΝ boundary census.
 *
 *  Two ways to ask "how many columns does this space-aligned table have?"
 *
 *    (a) CELL-COUNT HISTOGRAM — count the maximal non-space runs on each line and
 *        take the modal counts. This is what KANNABOS does today (`kannabosPlan`),
 *        and it is right when every column is a single run. It is WRONG the moment
 *        the last column is prose: `dpkg -l`'s Description contributes one run per
 *        word, so the modal cell counts are 10/9/8 and the true column count, 5,
 *        is never even a candidate.
 *
 *    (b) GAP VOTING — every run of >=2 spaces casts one vote for the offset at
 *        which the next field begins. A column boundary is a gap that occurs on
 *        almost every line; prose inside the last column casts votes at offsets
 *        that occur once each, so it cannot manufacture a boundary.
 *
 *  This script measures both on every real lane it is given. No frontier calls.
 */
import * as fs from 'node:fs';

/** offsets at which a run of >=2 spaces ends, i.e. candidate field starts */
function gapVotes(lines: string[]): Map<number, number> {
  const hist = new Map<number, number>();
  for (const l of lines) {
    const re = /( {2,})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(l)) !== null) {
      const e = m.index + m[1].length;
      hist.set(e, (hist.get(e) ?? 0) + 1);
    }
  }
  return hist;
}

export interface Vote {
  lines: number;
  /** boundaries with support >= minSup, ascending */
  bounds: number[];
  support: number[];
  k: number;
  minSup: number;
  /** the k values a cell-count histogram would have proposed */
  cellKs: number[];
  agrees: boolean;
}

export function voteColumns(text: string, frac = 0.6): Vote | null {
  const trailingNL = text.endsWith('\n');
  const lines = (trailingNL ? text.slice(0, -1) : text).split('\n');
  if (lines.length < 5) return null;
  const hist = gapVotes(lines);
  const minSup = Math.max(3, Math.ceil(lines.length * frac));
  const bounds = [...hist.entries()].filter(([, n]) => n >= minSup).map(([o]) => o).sort((a, b) => a - b);
  const support = bounds.map((b) => hist.get(b)!);
  const cellHist = new Map<number, number>();
  for (const l of lines) {
    const k = (l.match(/[^ ]+/g) ?? []).length;
    cellHist.set(k, (cellHist.get(k) ?? 0) + 1);
  }
  const cellKs = [...cellHist.entries()]
    .filter(([k, n]) => k >= 3 && n >= minSup)
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])
    .slice(0, 3)
    .map(([k]) => k);
  return {
    lines: lines.length, bounds, support, k: bounds.length + 1, minSup, cellKs,
    agrees: cellKs.includes(bounds.length + 1),
  };
}

if (process.argv[1] && process.argv.length > 2) {
  const rows: any[] = [];
  for (const p of process.argv.slice(2)) {
    let S: string;
    try { S = fs.readFileSync(p, 'utf8'); } catch { continue; }
    const v = voteColumns(S);
    const cellHist = new Map<number, number>();
    for (const l of (S.endsWith('\n') ? S.slice(0, -1) : S).split('\n')) {
      const k = (l.match(/[^ ]+/g) ?? []).length;
      cellHist.set(k, (cellHist.get(k) ?? 0) + 1);
    }
    const top = [...cellHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!v) { console.log(`${p.split('/').pop()!.padEnd(22)} too few lines`); continue; }
    console.log(
      `${p.split('/').pop()!.padEnd(22)} lines=${String(v.lines).padStart(4)} ` +
      `VOTE k=${String(v.k).padStart(2)} bounds=[${v.bounds.join(',')}] sup=[${v.support.join(',')}]  ` +
      `CELLHIST top=[${top.map(([k, n]) => `${k}:${n}`).join(' ')}]  agrees=${v.agrees}`,
    );
    rows.push({ lane: p.split('/').pop(), ...v, cellTop: top.map(([k, n]) => ({ k, n })) });
  }
  fs.mkdirSync('bench/x86/receipts', { recursive: true });
  fs.writeFileSync('bench/x86/receipts/gaps.json', JSON.stringify(rows, null, 1) + '\n');
  const dis = rows.filter((r) => !r.agrees && r.bounds.length >= 2);
  console.log(`\nlanes where the vote and the cell-count histogram DISAGREE and the vote found a grid: ${dis.length}`);
  for (const r of dis) console.log(`  ${r.lane.padEnd(22)} vote k=${r.k} [${r.bounds.join(',')}]  cellhist proposed [${r.cellKs.join(',')}]`);
}
