/**
 * X97 — STRUCTURAL CENSUS OF THE 29 FRONTIER LANES.  Zero frontier calls, pure file reading, so it
 * runs in seconds and cannot contaminate a timing run.  It answers three questions the turn needs:
 *
 *  1. REPRESENTATION.  How much of the corpus is not in a canonical form that a byte-perfect codec
 *     may normalise losslessly?  (NFC/NFD are lossless; NFKC/NFKD are LOSSY and inadmissible.)
 *  2. COLUMN STRUCTURE.  Which lanes are delimiter-free whitespace-aligned tables -- the shape
 *     ΣΤΙΧΟΜΥΘΊΑ's column programs were built for DELIMITED tables and therefore may not fire on.
 *  3. REPEAT STRUCTURE.  Where is the remaining duplicated material, measured as tokens, not chars.
 */
import * as fs from 'node:fs';
const OUT = 'bench/x97/receipts/census.json';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').trim().split(/\s+/);
const rows: any[] = [];
const nfc = (s: string): string => s.normalize('NFC');
const nfd = (s: string): string => s.normalize('NFD');
for (const p of lanes) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  const nonEmpty = lines.filter((l) => l.length > 0);
  // column structure: split each line on runs of 2+ spaces or a single tab; a lane is "columnar"
  // if a large majority of lines yield the SAME field count >= 3
  const fc = new Map<number, number>();
  for (const l of nonEmpty) {
    const n = l.split(/\t| {2,}/).length;
    fc.set(n, (fc.get(n) ?? 0) + 1);
  }
  let bestN = 0, bestC = 0;
  for (const [n, c] of fc) if (c > bestC) { bestC = c; bestN = n; }
  const columnar = bestN >= 3 && bestC >= Math.max(3, Math.floor(0.8 * nonEmpty.length));
  // repeat structure: distinct lines vs total lines
  const dl = new Set(nonEmpty).size;
  rows.push({
    path: p, lane: p.split('/').pop(), chars: t.length, lines: nonEmpty.length,
    distinctLines: dl, dupLineFrac: +(1 - dl / Math.max(1, nonEmpty.length)).toFixed(4),
    // representation
    isNFC: nfc(t) === t, isNFD: nfd(t) === t, hasCR: t.includes('\r'), hasTab: t.includes('\t'),
    hasBOM: t.charCodeAt(0) === 0xfeff, nonAscii: [...t].filter((c) => c.charCodeAt(0) > 127).length,
    trailingWS: lines.filter((l) => l !== l.replace(/\s+$/, '')).length,
    // columns
    columnar, modalFieldCount: bestN, modalFieldLines: bestC,
    fieldCounts: [...fc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
  });
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ note: 'X97 structural census, zero frontier calls', rows }, null, 1) + '\n');
const pct = (f: (r: any) => boolean) => `${rows.filter(f).length}/${rows.length}`;
console.log(`lanes                              ch     lines  dup%  NFC   NFD   CR  tab BOM nonASCII trailWS  col  fields`);
for (const r of rows) {
  console.log(`${r.lane.padEnd(24)} ${String(r.chars).padStart(7)} ${String(r.lines).padStart(6)} ${(100 * r.dupLineFrac).toFixed(0).padStart(4)}%  ` +
    `${r.isNFC ? ' Y ' : ' n '}   ${r.isNFD ? ' Y ' : ' n '}   ${r.hasCR ? 'Y' : '.'}    ${r.hasTab ? 'Y' : '.'}   ${r.hasBOM ? 'Y' : '.'}  ${String(r.nonAscii).padStart(7)}  ${String(r.trailingWS).padStart(6)}   ${r.columnar ? 'Y' : '.'}   ${r.modalFieldCount}`);
}
console.log(`\nnot NFC: ${pct((r) => !r.isNFC)}   not NFD: ${pct((r) => !r.isNFD)}   has CR: ${pct((r) => r.hasCR)}   has tab: ${pct((r) => r.hasTab)}   has BOM: ${pct((r) => r.hasBOM)}   trailing WS lines: ${pct((r) => r.trailingWS > 0)}`);
console.log(`delimiter-free columnar (>=3 fields, >=80% of lines agree): ${rows.filter((r) => r.columnar).map((r) => r.lane).join(', ')}`);
console.log(`\nwrote ${OUT}`);
