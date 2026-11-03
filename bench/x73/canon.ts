/**
 * X73 probe 6 — can the gap rule be FREE?
 *
 * A TAB normal form needs the original gap widths back. If the source is
 * CANONICAL — every column padded to the width of its longest cell, which is
 * what `ls`, `ps`, `findmnt`, `dpkg` and every column printer actually emit —
 * then the widths do not have to be declared at all: the decoder re-derives each
 * column's width from the longest cell it just received. That makes the whole
 * rule one sentence of ~15 tokens instead of a width vector.
 *
 * This probe checks, lane by lane, whether canonical re-padding reproduces the
 * source byte for byte. Where it does, the transform is free to describe; where
 * it does not, the codec abstains.
 */
import * as fs from 'node:fs';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n');
  const counts = new Map<number, number>();
  for (const l of lines) if (l.trim()) { const n = l.trim().split(/ +/).length; counts.set(n, (counts.get(n) ?? 0) + 1); }
  const K = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const rowsIdx: number[] = [];
  const cells: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const cs = lines[i].trim() ? lines[i].trim().split(/ +/) : [];
    if (cs.length === K) { rowsIdx.push(i); cells.push(cs); }
  }
  const w: number[] = Array.from({ length: K }, (_, c) => Math.max(...cells.map(r => r[c].length)));
  let exact = 0, bad = 0;
  const badLines: string[] = [];
  for (let r = 0; r < cells.length; r++) {
    const rebuilt = cells[r].map((x, c) => c + 1 < K ? x + ' '.repeat(w[c] - x.length + 1) : x).join('');
    if (rebuilt === lines[rowsIdx[r]]) exact++;
    else { bad++; if (badLines.length < 2) badLines.push(`${JSON.stringify(lines[rowsIdx[r]].slice(0, 60))} != ${JSON.stringify(rebuilt.slice(0, 60))}`); }
  }
  console.log(`${p.split('/').pop().padEnd(24)} K=${String(K).padStart(2)} rows=${String(cells.length).padStart(3)} canonical-exact ${String(exact).padStart(3)} / ${cells.length}  widths [${w.join(',')}]`);
  for (const b of badLines) console.log('    ' + b);
}
