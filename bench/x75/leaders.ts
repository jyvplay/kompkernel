/**
 * X75 — GENERALIZED LOCAL LEADERS, computed not asserted.
 * Reuses bench/x75/receipts/gate75-det.json for the frontier numbers (already measured
 * in the same process as the gate) and adds only the unreadable floor (brotli -q11,
 * converted at 14.8 bits/token) — no second frontier encode.
 */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
const d = JSON.parse(fs.readFileSync('bench/x75/receipts/gate75-det.json', 'utf8'));
const CAT: Record<string, string> = {
  'lsblk.txt': 'ops: block/tree', 'uptime-w.txt': 'ops: single record', 'free-m.txt': 'ops: key-value table',
  'vmstat.txt': 'ops: aligned table', 'df-h.txt': 'ops: aligned table', 'df-real.txt': 'ops: aligned table',
  'du-real.txt': 'ops: path list', 'node-help.txt': 'docs: usage text', 'findmnt.txt': 'ops: tree table',
  'ps-ef.txt': 'ops: process table', 'ls-real.txt': 'ops: listing', 'json-pkg.txt': 'structured: JSON',
  'code-ts.txt': 'source: TypeScript', 'dpkg-l.txt': 'ops: package table', 'ps-real.txt': 'ops: process table',
  'kubectl-get-pods.txt': 'ops: aligned table', 'metrics.tsv': 'ops: delimited metrics',
  'ps-aux-real.txt': 'ops: process table', 'apt-real.txt': 'ops: log/transcript', 'ls-l-real.txt': 'ops: listing',
  'kb-article.txt': 'prose: article', 'unified-diff.patch': 'source: diff', 'email-thread.txt': 'prose: email',
  'llm-answer.md': 'prose: markdown', 'markdown-table.md': 'structured: md table',
  'psql-output.txt': 'ops: query output', 'prices.csv': 'structured: CSV', 'cue-sheet.md': 'ops: cue list',
};
const rows = d.rows.map((r: any) => {
  const t = fs.readFileSync(r.path, 'utf8');
  const br = zlib.brotliCompressSync(Buffer.from(t, 'utf8'), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  const floor = Math.max(1, Math.ceil((br * 8) / 14.8));
  return { name: r.path.split('/').pop(), cat: CAT[r.path.split('/').pop()] ?? 'misc', raw: r.raw,
    x75: r.out, delta: r.delta, floor, ratio: +(r.out / floor).toFixed(2), arm: r.arm };
});
const byCat = new Map<string, any[]>();
for (const r of rows) { if (!byCat.has(r.cat)) byCat.set(r.cat, []); byCat.get(r.cat)!.push(r); }
console.log('PER-LANE (X75 treatment, 29 lanes)');
for (const r of [...rows].sort((a, b) => b.ratio - a.ratio))
  console.log(`  ${r.name.padEnd(22)} ${r.cat.padEnd(20)} raw ${String(r.raw).padStart(5)} x75 ${String(r.x75).padStart(5)} floor ${String(r.floor).padStart(5)}  x${r.ratio.toFixed(2)}  ${r.delta ? `(${r.delta})` : ''}`);
console.log('\nBY CATEGORY (generalized local leaders)');
const cats = [...byCat.entries()].sort((a, b) => {
  const ra = a[1].reduce((s, x) => s + x.x75, 0) / a[1].reduce((s, x) => s + x.floor, 0);
  const rb = b[1].reduce((s, x) => s + x.x75, 0) / b[1].reduce((s, x) => s + x.floor, 0);
  return rb - ra;
});
for (const [c, rs] of cats) {
  const t = rs.reduce((s, x) => s + x.x75, 0), f = rs.reduce((s, x) => s + x.floor, 0);
  console.log(`  ${c.padEnd(20)} lanes ${String(rs.length).padStart(2)}  tokens ${String(t).padStart(5)}  floor ${String(f).padStart(5)}  x${(t / f).toFixed(2)}  headroom ${(t / f).toFixed(2)}x  worst ${rs.reduce((m, x) => x.ratio > m.ratio ? x : m).name}(${Math.max(...rs.map((x) => x.ratio))})`);
}
fs.writeFileSync('bench/x75/receipts/leaders.json', JSON.stringify({ rows, categories: cats.map(([c, rs]) => ({ cat: c, lanes: rs.length, tokens: rs.reduce((s, x) => s + x.x75, 0), floor: rs.reduce((s, x) => s + x.floor, 0) })) }, null, 1) + '\n');
