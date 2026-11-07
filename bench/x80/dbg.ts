import * as fs from 'node:fs';
const p = process.argv[2];
const S = fs.readFileSync(p, 'utf8');
const L = S.split('\n');
// observed start offset of each field (split on runs of >=2 spaces)
const cells = L.map((l) => l.split(/(?<= ) {1,}(?=\S)/));
const ncols = Math.max(...cells.map((c) => c.length));
const starts: number[][] = [];
for (const l of L) { const a: number[] = []; let o = 0;
  for (const part of l.split(/(?<= ) {1,}(?=\S)/)) { a.push(o); o += part.length + 1; } starts.push(a); }
const qual = starts.map((a, i) => [a, cells[i]] as const).filter(([a]) => a.length === ncols);
console.log(`${p.split('/').pop()} ncols=${ncols} qualifying=${qual.length}/${L.length}`);
for (let j = 0; j < ncols; j++) {
  const offs = new Map<number, number>();
  let mx = 0;
  for (const [a, c] of qual) { offs.set(a[j], (offs.get(a[j]) ?? 0) + 1); mx = Math.max(mx, c[j].length); }
  const top = [...offs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
  console.log(`  col ${j}: maxContentLen=${mx}  startOffsets=${top.map(([o, n]) => `${o}×${n}`).join(' ')}`);
}
