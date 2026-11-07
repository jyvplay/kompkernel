/** X80 — is inter-column padding restorable by re-aligning each column to its max width?
 *  If yes, "collapse padding to one space" is LOSSLESS, not lossy. */
import * as fs from 'node:fs';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const L = S.split('\n');
  // split every line on runs of >=2 spaces
  const cells = L.map((l) => l.split(/(?<= ) {1,}(?=\S)/));
  const ncols = Math.max(...cells.map((c) => c.length));
  const uniform = cells.filter((c) => c.length === ncols).length;
  // per-column max width
  const w: number[] = [];
  for (let j = 0; j < ncols; j++) {
    let mx = 0;
    for (const c of cells) if (c.length === ncols) mx = Math.max(mx, c[j].length);
    w[j] = mx;
  }
  // rebuild: left-justify each column to w[j], except the last
  const rebuilt = cells.map((c) => {
    if (c.length !== ncols) return c.join(' ');
    return c.map((v, j) => (j === ncols - 1 ? v : v.padEnd(w[j], ' '))).join(' ');
  }).join('\n');
  const ok = rebuilt === S;
  // also: how many space chars would collapsing save?
  const collapsed = S.replace(/(?<= ) +(?=\S)/g, '');
  console.log(`${p.split('/').pop()!.padEnd(22)} lines ${String(L.length).padStart(4)} cols ${String(ncols).padStart(2)} uniform ${String(uniform).padStart(4)} | restore_by_maxwidth=${ok} | savedChars ${S.length - collapsed.length}`);
}
